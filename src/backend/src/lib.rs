use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::Arc,
};

use anyhow::{anyhow, Context};
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use chrono::{SecondsFormat, Utc};
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::{
    net::TcpListener,
    sync::{broadcast, mpsc, RwLock},
};
use tower_http::trace::TraceLayer;
use uuid::Uuid;

const SESSION_VIEW: &str = "session.view";
const SESSION_EDIT_PROMPT: &str = "session.edit_prompt";

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub allowed_origins: Vec<String>,
    auth: AuthConfig,
}

#[derive(Debug, Clone)]
enum AuthConfig {
    DevBypass,
    Jwt { secret: Arc<str> },
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Self::from_env_map(|key| std::env::var(key).ok())
    }

    fn from_env_map<F>(mut get: F) -> anyhow::Result<Self>
    where
        F: FnMut(&str) -> Option<String>,
    {
        let port = get("PORT")
            .unwrap_or_else(|| "4001".to_string())
            .parse::<u16>()
            .context("PORT must be a valid u16")?;

        let host = get("HOST").unwrap_or_else(|| "0.0.0.0".to_string());
        let ip = host
            .parse::<IpAddr>()
            .with_context(|| format!("HOST must be a valid IP address, got {host}"))?;

        let allowed_origins = get("ALLOWED_ORIGINS")
            .unwrap_or_else(|| "http://localhost:3000,http://127.0.0.1:3000".to_string())
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();

        let dev_auth_bypass = parse_bool(get("LABRADOR_DEV_AUTH_BYPASS").as_deref());
        let auth = if dev_auth_bypass {
            AuthConfig::DevBypass
        } else {
            let secret = get("REALTIME_AUTH_JWT_SECRET")
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    anyhow!(
                        "REALTIME_AUTH_JWT_SECRET is required unless LABRADOR_DEV_AUTH_BYPASS=true"
                    )
                })?;

            AuthConfig::Jwt {
                secret: Arc::from(secret),
            }
        };

        Ok(Self {
            bind_addr: SocketAddr::new(ip, port),
            allowed_origins,
            auth,
        })
    }
}

pub async fn run(config: Config) -> anyhow::Result<()> {
    let bind_addr = config.bind_addr;
    let app = app(config);
    let listener = TcpListener::bind(bind_addr)
        .await
        .with_context(|| format!("failed to bind realtime service on {bind_addr}"))?;

    tracing::info!(addr = %listener.local_addr()?, "labrador realtime service listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("realtime service stopped unexpectedly")
}

pub fn app(config: Config) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/health", get(health))
        .route("/ws/{room_id}", get(websocket_handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "labrador-realtime",
    })
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Debug, Deserialize)]
struct WsQuery {
    token: Option<String>,
}

async fn websocket_handler(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    Query(query): Query<WsQuery>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Response {
    if !origin_allowed(&headers, &state.inner.config.allowed_origins) {
        return http_error(
            StatusCode::FORBIDDEN,
            "permission_denied",
            "origin is not allowed for realtime connections",
        );
    }

    let actor = match state.authorize_connection(query.token.as_deref(), &room_id) {
        Ok(actor) => actor,
        Err(error) => return http_error(error.status, error.code, error.message),
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, room_id, actor))
}

fn http_error(status: StatusCode, code: &'static str, message: &'static str) -> Response {
    (status, Json(json!({ "code": code, "message": message }))).into_response()
}

async fn handle_socket(
    mut socket: WebSocket,
    state: AppState,
    room_id: String,
    actor: AuthorizedActor,
) {
    let joined = state.join_room(&room_id, &actor).await;
    let joined_event = server_event(
        "room.joined",
        &room_id,
        Some(joined.room_seq),
        Some(actor.actor_id.clone()),
        RoomJoinedPayload {
            connection_id: joined.connection_id.clone(),
            actor: actor.safe_summary(),
            capabilities: actor.capabilities.clone(),
            seq: joined.room_seq,
        },
    );
    let snapshot_event = server_event(
        "presence.snapshot",
        &room_id,
        None,
        None,
        joined.snapshot.clone(),
    );

    if send_initial_event(&mut socket, &joined_event)
        .await
        .is_err()
        || send_initial_event(&mut socket, &snapshot_event)
            .await
            .is_err()
    {
        state.leave_room(&room_id, &joined.connection_id).await;
        return;
    }

    let _ = joined.room_tx.send(joined.join_event);

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let mut room_rx = joined.room_tx.subscribe();
    let (direct_tx, mut direct_rx) = mpsc::channel::<ServerEnvelope>(64);

    let send_room_id = room_id.clone();
    let send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                room_event = room_rx.recv() => {
                    match room_event {
                        Ok(event) => {
                            if send_ws_event(&mut ws_sender, &event).await.is_err() {
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => {
                            let event = server_event(
                                "room.resync_required",
                                &send_room_id,
                                None,
                                None,
                                json!({ "reason": "missed_room_events" }),
                            );
                            if send_ws_event(&mut ws_sender, &event).await.is_err() {
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
                direct_event = direct_rx.recv() => {
                    match direct_event {
                        Some(event) => {
                            if send_ws_event(&mut ws_sender, &event).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    }
                }
            }
        }
    });

    while let Some(message) = ws_receiver.next().await {
        match message {
            Ok(Message::Text(text)) => {
                handle_client_text(
                    &state,
                    &room_id,
                    &joined.connection_id,
                    &actor,
                    &direct_tx,
                    text.as_str(),
                )
                .await;
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) | Ok(Message::Binary(_)) => {}
            Err(error) => {
                tracing::debug!(%room_id, error = %error, "websocket receive error");
                break;
            }
        }
    }

    send_task.abort();
    state.leave_room(&room_id, &joined.connection_id).await;
}

async fn send_initial_event(
    socket: &mut WebSocket,
    event: &ServerEnvelope,
) -> Result<(), axum::Error> {
    let text = serde_json::to_string(event).expect("server event serialization failed");
    socket.send(Message::Text(text.into())).await
}

async fn send_ws_event(
    sender: &mut futures_util::stream::SplitSink<WebSocket, Message>,
    event: &ServerEnvelope,
) -> Result<(), axum::Error> {
    let text = serde_json::to_string(event).expect("server event serialization failed");
    sender.send(Message::Text(text.into())).await
}

async fn handle_client_text(
    state: &AppState,
    room_id: &str,
    connection_id: &str,
    actor: &AuthorizedActor,
    direct_tx: &mpsc::Sender<ServerEnvelope>,
    text: &str,
) {
    let parsed = match serde_json::from_str::<ClientEvent>(text) {
        Ok(event) => event,
        Err(_) => {
            let _ = direct_tx
                .send(room_error(
                    room_id,
                    None,
                    "payload_invalid",
                    "client event must be valid JSON",
                ))
                .await;
            return;
        }
    };

    let client_event_id = parsed.event_id.clone();
    let ack = match parsed.event_type.as_str() {
        "room.join" => ack(room_id, client_event_id, true, None, None),
        "presence.update" => match serde_json::from_value::<ClientPresencePatch>(parsed.payload) {
            Ok(patch) => {
                state.update_presence(room_id, connection_id, &patch).await;
                ack(room_id, client_event_id, true, None, None)
            }
            Err(_) => ack(
                room_id,
                client_event_id,
                false,
                Some("payload_invalid"),
                None,
            ),
        },
        "draft.patch" => {
            if !actor.has_capability(SESSION_EDIT_PROMPT) {
                ack(
                    room_id,
                    client_event_id,
                    false,
                    Some("permission_denied"),
                    None,
                )
            } else {
                match serde_json::from_value::<DraftPatchPayload>(parsed.payload) {
                    Ok(patch) => match state
                        .broadcast_draft_patch(
                            room_id,
                            connection_id,
                            actor,
                            client_event_id.clone(),
                            patch,
                        )
                        .await
                    {
                        Ok(seq) => ack(room_id, client_event_id, true, None, Some(seq)),
                        Err(code) => ack(room_id, client_event_id, false, Some(code), None),
                    },
                    Err(_) => ack(
                        room_id,
                        client_event_id,
                        false,
                        Some("payload_invalid"),
                        None,
                    ),
                }
            }
        }
        _ => ack(
            room_id,
            client_event_id,
            false,
            Some("payload_invalid"),
            None,
        ),
    };

    let _ = direct_tx.send(ack).await;
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    event_id: Option<String>,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientPresencePatch {
    typing: Option<bool>,
    focus: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct DraftPatchPayload {
    base_version: Option<u64>,
    client_version: Option<u64>,
    patch: Value,
}

#[derive(Debug, Clone)]
struct JoinedRoom {
    connection_id: String,
    room_seq: u64,
    snapshot: PresenceSnapshotPayload,
    join_event: ServerEnvelope,
    room_tx: broadcast::Sender<ServerEnvelope>,
}

#[derive(Clone)]
struct AppState {
    inner: Arc<AppStateInner>,
}

struct AppStateInner {
    config: Config,
    auth: AuthVerifier,
    rooms: RwLock<HashMap<String, RoomState>>,
}

impl AppState {
    fn new(config: Config) -> Self {
        let auth = AuthVerifier::from_config(&config);

        Self {
            inner: Arc::new(AppStateInner {
                config,
                auth,
                rooms: RwLock::new(HashMap::new()),
            }),
        }
    }

    fn authorize_connection(
        &self,
        token: Option<&str>,
        requested_room_id: &str,
    ) -> Result<AuthorizedActor, AuthFailure> {
        self.inner.auth.authorize(token, requested_room_id)
    }

    async fn join_room(&self, room_id: &str, actor: &AuthorizedActor) -> JoinedRoom {
        let connection_id = Uuid::new_v4().to_string();
        let connected_at = now();

        let member = PresenceMember {
            connection_id: connection_id.clone(),
            actor_id: actor.actor_id.clone(),
            display_name: actor.display_name.clone(),
            role: actor.role.clone(),
            anonymous: actor.anonymous,
            typing: false,
            focus: None,
            connected_at: connected_at.clone(),
            last_seen_at: connected_at,
        };

        let mut rooms = self.inner.rooms.write().await;
        let room = rooms
            .entry(room_id.to_string())
            .or_insert_with(RoomState::new);
        room.presence.insert(connection_id.clone(), member.clone());
        let room_seq = room.next_seq();
        let snapshot = room.snapshot();
        let room_tx = room.tx.clone();

        let join_event = server_event(
            "presence.update",
            room_id,
            None,
            visible_actor_id(actor),
            PresenceUpdatePayload::from_member(&member, true),
        );

        JoinedRoom {
            connection_id,
            room_seq,
            snapshot,
            join_event,
            room_tx,
        }
    }

    async fn leave_room(&self, room_id: &str, connection_id: &str) {
        let mut rooms = self.inner.rooms.write().await;
        let Some(room) = rooms.get_mut(room_id) else {
            return;
        };

        let Some(member) = room.presence.remove(connection_id) else {
            return;
        };

        let room_tx = room.tx.clone();
        let leave_event = server_event(
            "presence.update",
            room_id,
            None,
            visible_member_actor_id(&member),
            PresenceUpdatePayload::from_member(&member, false),
        );
        let should_remove_room = room.presence.is_empty();

        if should_remove_room {
            rooms.remove(room_id);
        }

        drop(rooms);
        let _ = room_tx.send(leave_event);
    }

    async fn update_presence(
        &self,
        room_id: &str,
        connection_id: &str,
        patch: &ClientPresencePatch,
    ) {
        let mut rooms = self.inner.rooms.write().await;
        let Some(room) = rooms.get_mut(room_id) else {
            return;
        };

        let Some(member) = room.presence.get_mut(connection_id) else {
            return;
        };

        if let Some(typing) = patch.typing {
            member.typing = typing;
        }
        if let Some(focus) = patch.focus.as_ref() {
            member.focus = Some(focus.clone());
        }
        member.last_seen_at = now();

        let event = server_event(
            "presence.update",
            room_id,
            None,
            visible_member_actor_id(member),
            PresenceUpdatePayload::from_member(member, true),
        );
        let tx = room.tx.clone();

        drop(rooms);
        let _ = tx.send(event);
    }

    async fn broadcast_draft_patch(
        &self,
        room_id: &str,
        connection_id: &str,
        actor: &AuthorizedActor,
        client_event_id: Option<String>,
        patch: DraftPatchPayload,
    ) -> Result<u64, &'static str> {
        let mut rooms = self.inner.rooms.write().await;
        let Some(room) = rooms.get_mut(room_id) else {
            return Err("room_not_found");
        };

        if !room.presence.contains_key(connection_id) {
            return Err("permission_denied");
        }

        let seq = room.next_seq();
        let tx = room.tx.clone();
        let event = server_event(
            "draft.patch",
            room_id,
            Some(seq),
            Some(actor.actor_id.clone()),
            json!({
                "connectionId": connection_id,
                "clientEventId": client_event_id,
                "baseVersion": patch.base_version,
                "clientVersion": patch.client_version,
                "patch": patch.patch,
            }),
        );

        drop(rooms);
        let _ = tx.send(event);
        Ok(seq)
    }
}

struct RoomState {
    seq: u64,
    tx: broadcast::Sender<ServerEnvelope>,
    presence: HashMap<String, PresenceMember>,
}

impl RoomState {
    fn new() -> Self {
        let (tx, _) = broadcast::channel(256);

        Self {
            seq: 0,
            tx,
            presence: HashMap::new(),
        }
    }

    fn next_seq(&mut self) -> u64 {
        self.seq += 1;
        self.seq
    }

    fn snapshot(&self) -> PresenceSnapshotPayload {
        let mut visible = Vec::new();
        let mut anonymous_count = 0;

        for member in self.presence.values() {
            if member.anonymous {
                anonymous_count += 1;
            } else {
                visible.push(member.clone());
            }
        }

        visible.sort_by(|left, right| left.connection_id.cmp(&right.connection_id));

        PresenceSnapshotPayload {
            visible,
            anonymous_count,
        }
    }
}

#[derive(Debug, Clone)]
struct AuthVerifier {
    config: AuthConfig,
}

impl AuthVerifier {
    fn from_config(config: &Config) -> Self {
        Self {
            config: config.auth.clone(),
        }
    }

    fn authorize(
        &self,
        token: Option<&str>,
        requested_room_id: &str,
    ) -> Result<AuthorizedActor, AuthFailure> {
        match &self.config {
            AuthConfig::DevBypass => Ok(AuthorizedActor {
                actor_id: "dev-user".to_string(),
                display_name: Some("Dev User".to_string()),
                role: Some("editor".to_string()),
                anonymous: false,
                capabilities: vec![SESSION_VIEW.to_string(), SESSION_EDIT_PROMPT.to_string()],
            }),
            AuthConfig::Jwt { secret } => {
                let token = token.ok_or(AuthFailure {
                    status: StatusCode::UNAUTHORIZED,
                    code: "unauthenticated",
                    message: "missing realtime token",
                })?;

                let mut validation = Validation::new(Algorithm::HS256);
                validation.validate_aud = false;

                let claims = decode::<RealtimeClaims>(
                    token,
                    &DecodingKey::from_secret(secret.as_bytes()),
                    &validation,
                )
                .map_err(|_| AuthFailure {
                    status: StatusCode::UNAUTHORIZED,
                    code: "unauthenticated",
                    message: "invalid realtime token",
                })?
                .claims;

                if claims.session_id != requested_room_id {
                    return Err(AuthFailure {
                        status: StatusCode::FORBIDDEN,
                        code: "permission_denied",
                        message: "realtime token does not grant this room",
                    });
                }

                if !claims
                    .capabilities
                    .iter()
                    .any(|capability| capability == SESSION_VIEW)
                {
                    return Err(AuthFailure {
                        status: StatusCode::FORBIDDEN,
                        code: "permission_denied",
                        message: "realtime token is missing session.view",
                    });
                }

                Ok(AuthorizedActor {
                    actor_id: claims.sub,
                    display_name: claims.display_name,
                    role: claims.role,
                    anonymous: claims.anonymous,
                    capabilities: claims.capabilities,
                })
            }
        }
    }
}

#[derive(Debug, Clone)]
struct AuthFailure {
    status: StatusCode,
    code: &'static str,
    message: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthorizedActor {
    actor_id: String,
    display_name: Option<String>,
    role: Option<String>,
    anonymous: bool,
    capabilities: Vec<String>,
}

impl AuthorizedActor {
    fn has_capability(&self, capability: &str) -> bool {
        self.capabilities
            .iter()
            .any(|candidate| candidate == capability)
    }

    fn safe_summary(&self) -> ActorSummary {
        ActorSummary {
            actor_id: if self.anonymous {
                None
            } else {
                Some(self.actor_id.clone())
            },
            display_name: if self.anonymous {
                None
            } else {
                self.display_name.clone()
            },
            role: self.role.clone(),
            anonymous: self.anonymous,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RealtimeClaims {
    pub sub: String,
    pub session_id: String,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub anonymous: bool,
    pub exp: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActorSummary {
    actor_id: Option<String>,
    display_name: Option<String>,
    role: Option<String>,
    anonymous: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RoomJoinedPayload {
    connection_id: String,
    actor: ActorSummary,
    capabilities: Vec<String>,
    seq: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PresenceSnapshotPayload {
    visible: Vec<PresenceMember>,
    anonymous_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PresenceMember {
    connection_id: String,
    actor_id: String,
    display_name: Option<String>,
    role: Option<String>,
    anonymous: bool,
    typing: bool,
    focus: Option<String>,
    connected_at: String,
    last_seen_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PresenceUpdatePayload {
    connection_id: String,
    actor_id: Option<String>,
    display_name: Option<String>,
    role: Option<String>,
    anonymous: bool,
    typing: bool,
    focus: Option<String>,
    present: bool,
}

impl PresenceUpdatePayload {
    fn from_member(member: &PresenceMember, present: bool) -> Self {
        Self {
            connection_id: member.connection_id.clone(),
            actor_id: if member.anonymous {
                None
            } else {
                Some(member.actor_id.clone())
            },
            display_name: if member.anonymous {
                None
            } else {
                member.display_name.clone()
            },
            role: member.role.clone(),
            anonymous: member.anonymous,
            typing: member.typing,
            focus: member.focus.clone(),
            present,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerEnvelope {
    #[serde(rename = "type")]
    pub event_type: String,
    pub room_id: String,
    pub event_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seq: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_id: Option<String>,
    pub sent_at: String,
    pub payload: Value,
}

fn server_event<T: Serialize>(
    event_type: &str,
    room_id: &str,
    seq: Option<u64>,
    actor_id: Option<String>,
    payload: T,
) -> ServerEnvelope {
    ServerEnvelope {
        event_type: event_type.to_string(),
        room_id: room_id.to_string(),
        event_id: Uuid::new_v4().to_string(),
        seq,
        actor_id,
        sent_at: now(),
        payload: serde_json::to_value(payload).unwrap_or_else(|_| json!({})),
    }
}

fn ack(
    room_id: &str,
    client_event_id: Option<String>,
    accepted: bool,
    error_code: Option<&'static str>,
    resource_version: Option<u64>,
) -> ServerEnvelope {
    server_event(
        "room.ack",
        room_id,
        None,
        None,
        json!({
            "clientEventId": client_event_id,
            "accepted": accepted,
            "errorCode": error_code,
            "resourceVersion": resource_version,
        }),
    )
}

fn room_error(
    room_id: &str,
    client_event_id: Option<String>,
    code: &'static str,
    message: &'static str,
) -> ServerEnvelope {
    server_event(
        "room.error",
        room_id,
        None,
        None,
        json!({
            "clientEventId": client_event_id,
            "code": code,
            "message": message,
        }),
    )
}

fn origin_allowed(headers: &HeaderMap, allowed_origins: &[String]) -> bool {
    if allowed_origins.iter().any(|origin| origin == "*") {
        return true;
    }

    let Some(origin) = headers.get(header::ORIGIN) else {
        return true;
    };

    let Ok(origin) = origin.to_str() else {
        return false;
    };

    allowed_origins
        .iter()
        .any(|allowed_origin| allowed_origin == origin)
}

fn visible_actor_id(actor: &AuthorizedActor) -> Option<String> {
    (!actor.anonymous).then(|| actor.actor_id.clone())
}

fn visible_member_actor_id(member: &PresenceMember) -> Option<String> {
    (!member.anonymous).then(|| member.actor_id.clone())
}

fn parse_bool(value: Option<&str>) -> bool {
    matches!(
        value.map(str::trim).map(str::to_ascii_lowercase).as_deref(),
        Some("1" | "true" | "yes" | "on")
    )
}

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};
    use std::net::Ipv4Addr;

    #[test]
    fn config_requires_jwt_secret_unless_dev_bypass_is_explicit() {
        let result = Config::from_env_map(|_| None);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("REALTIME_AUTH_JWT_SECRET"));
    }

    #[test]
    fn config_supports_explicit_dev_auth_bypass() {
        let config = Config::from_env_map(|key| match key {
            "LABRADOR_DEV_AUTH_BYPASS" => Some("true".to_string()),
            _ => None,
        })
        .expect("dev config should load");

        assert_eq!(
            config.bind_addr,
            SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), 4001)
        );

        let verifier = AuthVerifier::from_config(&config);
        let actor = verifier
            .authorize(None, "session_dev")
            .expect("dev bypass should authorize");

        assert!(actor.has_capability(SESSION_VIEW));
        assert!(actor.has_capability(SESSION_EDIT_PROMPT));
    }

    #[test]
    fn jwt_authorization_enforces_room_and_view_capability() {
        let secret = "test-secret";
        let config = Config::from_env_map(|key| match key {
            "REALTIME_AUTH_JWT_SECRET" => Some(secret.to_string()),
            _ => None,
        })
        .expect("jwt config should load");

        let verifier = AuthVerifier::from_config(&config);
        let token = encode(
            &Header::new(Algorithm::HS256),
            &json!({
                "sub": "user_123",
                "sessionId": "session_123",
                "capabilities": [SESSION_VIEW],
                "displayName": "Ada",
                "role": "viewer",
                "exp": Utc::now().timestamp() as usize + 3600
            }),
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .expect("token should encode");

        let actor = verifier
            .authorize(Some(&token), "session_123")
            .expect("matching room and view capability should authorize");
        assert_eq!(actor.actor_id, "user_123");

        let wrong_room = verifier
            .authorize(Some(&token), "session_other")
            .expect_err("wrong room should be denied");
        assert_eq!(wrong_room.code, "permission_denied");

        let missing_view = encode(
            &Header::new(Algorithm::HS256),
            &json!({
                "sub": "user_123",
                "sessionId": "session_123",
                "capabilities": [],
                "exp": Utc::now().timestamp() as usize + 3600
            }),
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .expect("token should encode");

        let denied = verifier
            .authorize(Some(&missing_view), "session_123")
            .expect_err("missing session.view should be denied");
        assert_eq!(denied.code, "permission_denied");
    }

    #[test]
    fn client_event_accepts_protocol_camel_case_event_id() {
        let event = serde_json::from_value::<ClientEvent>(json!({
            "type": "draft.patch",
            "eventId": "client-1",
            "payload": {
                "baseVersion": 1,
                "clientVersion": 2,
                "patch": { "op": "replace", "text": "hello" }
            }
        }))
        .expect("client event should deserialize");

        assert_eq!(event.event_type, "draft.patch");
        assert_eq!(event.event_id.as_deref(), Some("client-1"));
    }
}
