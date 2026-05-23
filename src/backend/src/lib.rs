use std::{
    collections::{HashMap, VecDeque},
    net::{IpAddr, SocketAddr},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};

use anyhow::{anyhow, Context};
use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{SecondsFormat, Utc};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::{
    net::TcpListener,
    sync::{broadcast, mpsc, Mutex},
    time,
};
use tower_http::trace::TraceLayer;
use uuid::Uuid;

const SESSION_VIEW: &str = "session.view";
const SESSION_COMMENT: &str = "session.comment";
const SESSION_EDIT_PROMPT: &str = "session.edit_prompt";
const DEFAULT_MAX_CONNECTIONS: usize = 10_000;
const DEFAULT_MAX_ROOM_CONNECTIONS: usize = 10_000;
const DEFAULT_ROOM_BROADCAST_CAPACITY: usize = 4_096;
const DEFAULT_ROOM_REPLAY_CAPACITY: usize = 1_024;
const DEFAULT_OUTBOUND_QUEUE_CAPACITY: usize = 256;
const DEFAULT_MAX_WS_MESSAGE_BYTES: usize = 64 * 1024;
const DEFAULT_MAX_EVENT_PAYLOAD_BYTES: usize = 48 * 1024;
const DEFAULT_MAX_PRESENCE_FOCUS_BYTES: usize = 512;
const DEFAULT_PRESENCE_EVENTS_PER_SECOND: f64 = 8.0;
const DEFAULT_PRESENCE_BURST: u32 = 24;
const DEFAULT_MUTATION_EVENTS_PER_SECOND: f64 = 20.0;
const DEFAULT_MUTATION_BURST: u32 = 40;
const DEFAULT_PING_INTERVAL_SECS: u64 = 25;

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub allowed_origins: Vec<String>,
    publish_secret: Option<Arc<str>>,
    limits: LimitsConfig,
    auth: AuthConfig,
}

#[derive(Debug, Clone)]
struct LimitsConfig {
    max_connections: usize,
    max_room_connections: usize,
    room_broadcast_capacity: usize,
    room_replay_capacity: usize,
    outbound_queue_capacity: usize,
    max_ws_message_bytes: usize,
    max_event_payload_bytes: usize,
    max_presence_focus_bytes: usize,
    presence_events_per_second: f64,
    presence_burst: u32,
    mutation_events_per_second: f64,
    mutation_burst: u32,
    ping_interval: Duration,
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
        let (auth, publish_secret) = if dev_auth_bypass {
            let publish_secret = get("REALTIME_PUBLISH_SECRET")
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| "dev-publish-secret".to_string());

            (AuthConfig::DevBypass, Some(Arc::from(publish_secret)))
        } else {
            let secret = get("REALTIME_AUTH_JWT_SECRET")
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    anyhow!(
                        "REALTIME_AUTH_JWT_SECRET is required unless LABRADOR_DEV_AUTH_BYPASS=true"
                    )
                })?;
            let publish_secret = get("REALTIME_PUBLISH_SECRET")
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty());

            let auth = AuthConfig::Jwt {
                secret: Arc::from(secret),
            };
            (auth, publish_secret.map(Arc::from))
        };

        let limits = LimitsConfig {
            max_connections: parse_usize(
                get("MAX_CONNECTIONS").as_deref(),
                DEFAULT_MAX_CONNECTIONS,
                "MAX_CONNECTIONS",
            )?,
            max_room_connections: parse_usize(
                get("MAX_ROOM_CONNECTIONS").as_deref(),
                DEFAULT_MAX_ROOM_CONNECTIONS,
                "MAX_ROOM_CONNECTIONS",
            )?,
            room_broadcast_capacity: parse_usize(
                get("ROOM_BROADCAST_CAPACITY").as_deref(),
                DEFAULT_ROOM_BROADCAST_CAPACITY,
                "ROOM_BROADCAST_CAPACITY",
            )?,
            room_replay_capacity: parse_usize(
                get("ROOM_REPLAY_CAPACITY").as_deref(),
                DEFAULT_ROOM_REPLAY_CAPACITY,
                "ROOM_REPLAY_CAPACITY",
            )?,
            outbound_queue_capacity: parse_usize(
                get("OUTBOUND_QUEUE_CAPACITY").as_deref(),
                DEFAULT_OUTBOUND_QUEUE_CAPACITY,
                "OUTBOUND_QUEUE_CAPACITY",
            )?,
            max_ws_message_bytes: parse_usize(
                get("MAX_WS_MESSAGE_BYTES").as_deref(),
                DEFAULT_MAX_WS_MESSAGE_BYTES,
                "MAX_WS_MESSAGE_BYTES",
            )?,
            max_event_payload_bytes: parse_usize(
                get("MAX_EVENT_PAYLOAD_BYTES").as_deref(),
                DEFAULT_MAX_EVENT_PAYLOAD_BYTES,
                "MAX_EVENT_PAYLOAD_BYTES",
            )?,
            max_presence_focus_bytes: parse_usize(
                get("MAX_PRESENCE_FOCUS_BYTES").as_deref(),
                DEFAULT_MAX_PRESENCE_FOCUS_BYTES,
                "MAX_PRESENCE_FOCUS_BYTES",
            )?,
            presence_events_per_second: parse_f64(
                get("PRESENCE_EVENTS_PER_SECOND").as_deref(),
                DEFAULT_PRESENCE_EVENTS_PER_SECOND,
                "PRESENCE_EVENTS_PER_SECOND",
            )?,
            presence_burst: parse_u32(
                get("PRESENCE_BURST").as_deref(),
                DEFAULT_PRESENCE_BURST,
                "PRESENCE_BURST",
            )?,
            mutation_events_per_second: parse_f64(
                get("MUTATION_EVENTS_PER_SECOND").as_deref(),
                DEFAULT_MUTATION_EVENTS_PER_SECOND,
                "MUTATION_EVENTS_PER_SECOND",
            )?,
            mutation_burst: parse_u32(
                get("MUTATION_BURST").as_deref(),
                DEFAULT_MUTATION_BURST,
                "MUTATION_BURST",
            )?,
            ping_interval: Duration::from_secs(parse_u64(
                get("PING_INTERVAL_SECS").as_deref(),
                DEFAULT_PING_INTERVAL_SECS,
                "PING_INTERVAL_SECS",
            )?),
        };

        Ok(Self {
            bind_addr: SocketAddr::new(ip, port),
            allowed_origins,
            publish_secret,
            limits,
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
        .route("/internal/rooms/{room_id}/events", post(publish_handler))
        .route("/rooms/{room_id}/publish", post(publish_handler))
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
#[serde(rename_all = "camelCase")]
struct WsQuery {
    token: Option<String>,
    last_seq: Option<u64>,
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

    let permit = match state.try_acquire_connection() {
        Ok(permit) => permit,
        Err(error) => return http_error(error.status, error.code, error.message),
    };
    let max_message_size = state.inner.config.limits.max_ws_message_bytes;

    ws.max_message_size(max_message_size)
        .max_frame_size(max_message_size)
        .on_upgrade(move |socket| {
            handle_socket(socket, state, room_id, query.last_seq, actor, permit)
        })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishRequest {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    actor_id: Option<String>,
    #[serde(default)]
    payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PublishResponse {
    accepted: bool,
    seq: Option<u64>,
    delivered: usize,
}

struct PublishResult {
    seq: Option<u64>,
    delivered: usize,
}

async fn publish_handler(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    headers: HeaderMap,
    Json(request): Json<PublishRequest>,
) -> Response {
    if !publish_authorized(&headers, state.inner.config.publish_secret.as_deref()) {
        return http_error(
            StatusCode::UNAUTHORIZED,
            "unauthenticated",
            "missing or invalid publish token",
        );
    }

    if !publish_event_allowed(&request.event_type) {
        return http_error(
            StatusCode::BAD_REQUEST,
            "payload_invalid",
            "unsupported publish event type",
        );
    }

    if payload_size(&request.payload) > state.inner.config.limits.max_event_payload_bytes {
        return http_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_invalid",
            "published event payload is too large",
        );
    }

    let result = state
        .publish_room_event(
            &room_id,
            &request.event_type,
            request.actor_id,
            request.payload,
        )
        .await;

    Json(PublishResponse {
        accepted: true,
        seq: result.seq,
        delivered: result.delivered,
    })
    .into_response()
}

fn http_error(status: StatusCode, code: &'static str, message: &'static str) -> Response {
    (status, Json(json!({ "code": code, "message": message }))).into_response()
}

async fn handle_socket(
    mut socket: WebSocket,
    state: AppState,
    room_id: String,
    last_seq: Option<u64>,
    actor: AuthorizedActor,
    _permit: ConnectionPermit,
) {
    let joined = match state.join_room(&room_id, last_seq, &actor).await {
        Ok(joined) => joined,
        Err(error) => {
            let _ = send_initial_event(
                &mut socket,
                &room_error(&room_id, None, error.code, error.message),
            )
            .await;
            return;
        }
    };
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
    for event in &joined.replay_events {
        if send_initial_event(&mut socket, event).await.is_err() {
            state.leave_room(&room_id, &joined.connection_id).await;
            return;
        }
    }
    if joined.replay_requires_resync {
        let resync_event = server_event(
            "room.resync_required",
            &room_id,
            None,
            None,
            json!({ "reason": "replay_window_expired", "currentSeq": joined.room_seq }),
        );
        if send_initial_event(&mut socket, &resync_event)
            .await
            .is_err()
        {
            state.leave_room(&room_id, &joined.connection_id).await;
            return;
        }
    }

    let _ = joined.room_tx.send(joined.join_event);

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let mut room_rx = joined.room_tx.subscribe();
    let (direct_tx, mut direct_rx) =
        mpsc::channel::<ServerEnvelope>(state.inner.config.limits.outbound_queue_capacity);
    let mut rate_limits = ConnectionRateLimits::new(&state.inner.config.limits);

    let send_room_id = room_id.clone();
    let ping_interval = state.inner.config.limits.ping_interval;
    let send_task = tokio::spawn(async move {
        let mut ping = time::interval(ping_interval);
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
                _ = ping.tick() => {
                    if ws_sender.send(Message::Ping(Bytes::new())).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    while let Some(message) = ws_receiver.next().await {
        match message {
            Ok(Message::Text(text)) => {
                if text.len() > state.inner.config.limits.max_event_payload_bytes {
                    if !try_send_direct(
                        &direct_tx,
                        room_error(
                            &room_id,
                            None,
                            "payload_invalid",
                            "client event is too large",
                        ),
                    ) {
                        break;
                    }
                    continue;
                }

                if !handle_client_text(
                    &state,
                    &room_id,
                    &joined.connection_id,
                    &actor,
                    &direct_tx,
                    &mut rate_limits,
                    text.as_str(),
                )
                .await
                {
                    break;
                }
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
    rate_limits: &mut ConnectionRateLimits,
    text: &str,
) -> bool {
    let parsed = match serde_json::from_str::<ClientEvent>(text) {
        Ok(event) => event,
        Err(_) => {
            return try_send_direct(
                direct_tx,
                room_error(
                    room_id,
                    None,
                    "payload_invalid",
                    "client event must be valid JSON",
                ),
            );
        }
    };

    let client_event_id = parsed.event_id.clone();
    let ack = match parsed.event_type.as_str() {
        "room.join" => ack(room_id, client_event_id, true, None, None),
        "presence.update" => {
            if !rate_limits.allow_presence() {
                ack(room_id, client_event_id, false, Some("rate_limited"), None)
            } else {
                match serde_json::from_value::<ClientPresencePatch>(parsed.payload) {
                    Ok(patch) => {
                        match state.update_presence(room_id, connection_id, &patch).await {
                            Ok(()) => ack(room_id, client_event_id, true, None, None),
                            Err(code) => ack(room_id, client_event_id, false, Some(code), None),
                        }
                    }
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
        "draft.patch" => {
            if !rate_limits.allow_mutation() {
                ack(room_id, client_event_id, false, Some("rate_limited"), None)
            } else if !actor.has_capability(SESSION_EDIT_PROMPT) {
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
        "reaction.toggle" => {
            if !rate_limits.allow_mutation() {
                ack(room_id, client_event_id, false, Some("rate_limited"), None)
            } else if !actor.has_capability(SESSION_COMMENT) {
                ack(
                    room_id,
                    client_event_id,
                    false,
                    Some("permission_denied"),
                    None,
                )
            } else {
                match serde_json::from_value::<ReactionTogglePayload>(parsed.payload) {
                    Ok(reaction) => match state
                        .broadcast_reaction_toggle(
                            room_id,
                            connection_id,
                            actor,
                            client_event_id.clone(),
                            reaction,
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
        "message.create" | "comment.create" => ack(
            room_id,
            client_event_id,
            false,
            Some("payload_invalid"),
            None,
        ),
        _ => ack(
            room_id,
            client_event_id,
            false,
            Some("payload_invalid"),
            None,
        ),
    };

    try_send_direct(direct_tx, ack)
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

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReactionTogglePayload {
    target_type: String,
    target_id: String,
    emoji: String,
    active: bool,
}

#[derive(Debug, Clone)]
struct JoinedRoom {
    connection_id: String,
    room_seq: u64,
    snapshot: PresenceSnapshotPayload,
    replay_events: Vec<Arc<ServerEnvelope>>,
    replay_requires_resync: bool,
    join_event: Arc<ServerEnvelope>,
    room_tx: broadcast::Sender<Arc<ServerEnvelope>>,
}

#[derive(Clone)]
struct AppState {
    inner: Arc<AppStateInner>,
}

struct AppStateInner {
    config: Config,
    auth: AuthVerifier,
    rooms: DashMap<String, Arc<Room>>,
    active_connections: AtomicUsize,
}

struct ConnectionPermit {
    inner: Arc<AppStateInner>,
}

impl Drop for ConnectionPermit {
    fn drop(&mut self) {
        self.inner.active_connections.fetch_sub(1, Ordering::AcqRel);
    }
}

impl AppState {
    fn new(config: Config) -> Self {
        let auth = AuthVerifier::from_config(&config);

        Self {
            inner: Arc::new(AppStateInner {
                config,
                auth,
                rooms: DashMap::new(),
                active_connections: AtomicUsize::new(0),
            }),
        }
    }

    fn try_acquire_connection(&self) -> Result<ConnectionPermit, AuthFailure> {
        let mut current = self.inner.active_connections.load(Ordering::Relaxed);
        loop {
            if current >= self.inner.config.limits.max_connections {
                return Err(AuthFailure {
                    status: StatusCode::SERVICE_UNAVAILABLE,
                    code: "rate_limited",
                    message: "realtime service is at connection capacity",
                });
            }

            match self.inner.active_connections.compare_exchange_weak(
                current,
                current + 1,
                Ordering::AcqRel,
                Ordering::Relaxed,
            ) {
                Ok(_) => {
                    return Ok(ConnectionPermit {
                        inner: Arc::clone(&self.inner),
                    });
                }
                Err(observed) => current = observed,
            }
        }
    }

    fn authorize_connection(
        &self,
        token: Option<&str>,
        requested_room_id: &str,
    ) -> Result<AuthorizedActor, AuthFailure> {
        self.inner.auth.authorize(token, requested_room_id)
    }

    async fn join_room(
        &self,
        room_id: &str,
        last_seq: Option<u64>,
        actor: &AuthorizedActor,
    ) -> Result<JoinedRoom, AuthFailure> {
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

        let room = self
            .inner
            .rooms
            .entry(room_id.to_string())
            .or_insert_with(|| {
                Arc::new(Room::new(
                    self.inner.config.limits.room_broadcast_capacity,
                    self.inner.config.limits.room_replay_capacity,
                ))
            })
            .clone();

        let mut state = room.state.lock().await;
        if state.presence.len() >= self.inner.config.limits.max_room_connections {
            return Err(AuthFailure {
                status: StatusCode::SERVICE_UNAVAILABLE,
                code: "rate_limited",
                message: "room is at connection capacity",
            });
        }

        let (replay_events, replay_requires_resync) = state.replay_after(last_seq);
        state.presence.insert(connection_id.clone(), member.clone());
        let room_seq = state.seq;
        let snapshot = state.snapshot();
        let room_tx = room.tx.clone();

        let join_event = server_event(
            "presence.update",
            room_id,
            None,
            visible_actor_id(actor),
            PresenceUpdatePayload::from_member(&member, true),
        );

        Ok(JoinedRoom {
            connection_id,
            room_seq,
            snapshot,
            replay_events,
            replay_requires_resync,
            join_event: Arc::new(join_event),
            room_tx,
        })
    }

    async fn leave_room(&self, room_id: &str, connection_id: &str) {
        let Some(room) = self.inner.rooms.get(room_id).map(|entry| entry.clone()) else {
            return;
        };

        let mut state = room.state.lock().await;
        let Some(member) = state.presence.remove(connection_id) else {
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

        drop(state);
        let _ = room_tx.send(Arc::new(leave_event));
    }

    async fn update_presence(
        &self,
        room_id: &str,
        connection_id: &str,
        patch: &ClientPresencePatch,
    ) -> Result<(), &'static str> {
        let Some(room) = self.inner.rooms.get(room_id).map(|entry| entry.clone()) else {
            return Err("room_not_found");
        };

        let mut state = room.state.lock().await;
        let Some(member) = state.presence.get_mut(connection_id) else {
            return Err("permission_denied");
        };

        if let Some(typing) = patch.typing {
            member.typing = typing;
        }
        if let Some(focus) = patch.focus.as_ref() {
            if focus.len() > self.inner.config.limits.max_presence_focus_bytes {
                return Err("payload_invalid");
            }
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

        drop(state);
        let _ = tx.send(Arc::new(event));
        Ok(())
    }

    async fn broadcast_draft_patch(
        &self,
        room_id: &str,
        connection_id: &str,
        actor: &AuthorizedActor,
        client_event_id: Option<String>,
        patch: DraftPatchPayload,
    ) -> Result<u64, &'static str> {
        if payload_size(&patch.patch) > self.inner.config.limits.max_event_payload_bytes {
            return Err("payload_invalid");
        }

        let Some(room) = self.inner.rooms.get(room_id).map(|entry| entry.clone()) else {
            return Err("room_not_found");
        };

        let mut state = room.state.lock().await;
        if !state.presence.contains_key(connection_id) {
            return Err("permission_denied");
        }

        let seq = state.next_seq();
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
        let event = Arc::new(event);
        state.record_event(event.clone());

        drop(state);
        let _ = tx.send(event);
        Ok(seq)
    }

    async fn broadcast_reaction_toggle(
        &self,
        room_id: &str,
        connection_id: &str,
        actor: &AuthorizedActor,
        client_event_id: Option<String>,
        reaction: ReactionTogglePayload,
    ) -> Result<u64, &'static str> {
        if !valid_reaction_payload(&reaction) {
            return Err("payload_invalid");
        }

        let Some(room) = self.inner.rooms.get(room_id).map(|entry| entry.clone()) else {
            return Err("room_not_found");
        };

        let mut state = room.state.lock().await;
        if !state.presence.contains_key(connection_id) {
            return Err("permission_denied");
        }

        let seq = state.next_seq();
        let tx = room.tx.clone();
        let event = Arc::new(server_event(
            "reaction.updated",
            room_id,
            Some(seq),
            visible_actor_id(actor),
            json!({
                "connectionId": connection_id,
                "clientEventId": client_event_id,
                "targetType": reaction.target_type,
                "targetId": reaction.target_id,
                "emoji": reaction.emoji,
                "active": reaction.active,
            }),
        ));
        state.record_event(event.clone());

        drop(state);
        let _ = tx.send(event);
        Ok(seq)
    }

    async fn publish_room_event(
        &self,
        room_id: &str,
        event_type: &str,
        actor_id: Option<String>,
        payload: Value,
    ) -> PublishResult {
        let Some(room) = self.inner.rooms.get(room_id).map(|entry| entry.clone()) else {
            return PublishResult {
                seq: None,
                delivered: 0,
            };
        };

        let mut state = room.state.lock().await;
        let seq = state.next_seq();
        let tx = room.tx.clone();
        let event = Arc::new(server_event(
            event_type,
            room_id,
            Some(seq),
            actor_id,
            payload,
        ));
        state.record_event(event.clone());
        let delivered = tx.receiver_count();

        drop(state);
        let _ = tx.send(event);
        PublishResult {
            seq: Some(seq),
            delivered,
        }
    }
}

struct Room {
    tx: broadcast::Sender<Arc<ServerEnvelope>>,
    state: Mutex<RoomState>,
}

impl Room {
    fn new(broadcast_capacity: usize, replay_capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(broadcast_capacity.max(1));

        Self {
            tx,
            state: Mutex::new(RoomState::new(replay_capacity)),
        }
    }
}

struct RoomState {
    seq: u64,
    replay_capacity: usize,
    recent_events: VecDeque<Arc<ServerEnvelope>>,
    presence: HashMap<String, PresenceMember>,
}

impl RoomState {
    fn new(replay_capacity: usize) -> Self {
        Self {
            seq: 0,
            replay_capacity,
            recent_events: VecDeque::with_capacity(replay_capacity.min(1024)),
            presence: HashMap::new(),
        }
    }

    fn next_seq(&mut self) -> u64 {
        self.seq += 1;
        self.seq
    }

    fn record_event(&mut self, event: Arc<ServerEnvelope>) {
        if self.replay_capacity == 0 || event.seq.is_none() {
            return;
        }

        if self.recent_events.len() >= self.replay_capacity {
            self.recent_events.pop_front();
        }
        self.recent_events.push_back(event);
    }

    fn replay_after(&self, last_seq: Option<u64>) -> (Vec<Arc<ServerEnvelope>>, bool) {
        let Some(last_seq) = last_seq else {
            return (Vec::new(), false);
        };

        if last_seq >= self.seq {
            return (Vec::new(), false);
        }

        let Some(oldest_seq) = self.recent_events.front().and_then(|event| event.seq) else {
            return (Vec::new(), true);
        };

        if last_seq < oldest_seq.saturating_sub(1) {
            return (Vec::new(), true);
        }

        let events = self
            .recent_events
            .iter()
            .filter(|event| event.seq.is_some_and(|seq| seq > last_seq))
            .cloned()
            .collect();

        (events, false)
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
                capabilities: vec![
                    SESSION_VIEW.to_string(),
                    SESSION_COMMENT.to_string(),
                    SESSION_EDIT_PROMPT.to_string(),
                ],
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

fn try_send_direct(sender: &mpsc::Sender<ServerEnvelope>, event: ServerEnvelope) -> bool {
    match sender.try_send(event) {
        Ok(()) => true,
        Err(mpsc::error::TrySendError::Full(_)) => false,
        Err(mpsc::error::TrySendError::Closed(_)) => false,
    }
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

fn publish_authorized(headers: &HeaderMap, publish_secret: Option<&str>) -> bool {
    let Some(publish_secret) = publish_secret else {
        return false;
    };

    let Some(value) = headers.get(header::AUTHORIZATION) else {
        return false;
    };

    let Ok(value) = value.to_str() else {
        return false;
    };

    value
        .strip_prefix("Bearer ")
        .is_some_and(|token| token == publish_secret)
}

fn publish_event_allowed(event_type: &str) -> bool {
    matches!(
        event_type,
        "message.created"
            | "comment.created"
            | "reaction.updated"
            | "message.reaction_changed"
            | "comment.reaction_changed"
            | "run.started"
            | "run.delta"
            | "run.status"
            | "member.changed"
            | "share.changed"
            | "version.created"
    )
}

fn payload_size(value: &Value) -> usize {
    serde_json::to_vec(value).map_or(usize::MAX, |bytes| bytes.len())
}

fn valid_reaction_payload(payload: &ReactionTogglePayload) -> bool {
    !payload.target_type.trim().is_empty()
        && payload.target_type.len() <= 32
        && !payload.target_id.trim().is_empty()
        && payload.target_id.len() <= 128
        && !payload.emoji.trim().is_empty()
        && payload.emoji.len() <= 64
}

struct ConnectionRateLimits {
    presence: TokenBucket,
    mutation: TokenBucket,
}

impl ConnectionRateLimits {
    fn new(config: &LimitsConfig) -> Self {
        Self {
            presence: TokenBucket::new(config.presence_events_per_second, config.presence_burst),
            mutation: TokenBucket::new(config.mutation_events_per_second, config.mutation_burst),
        }
    }

    fn allow_presence(&mut self) -> bool {
        self.presence.allow()
    }

    fn allow_mutation(&mut self) -> bool {
        self.mutation.allow()
    }
}

struct TokenBucket {
    refill_per_second: f64,
    capacity: f64,
    tokens: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(refill_per_second: f64, burst: u32) -> Self {
        let capacity = f64::from(burst.max(1));

        Self {
            refill_per_second,
            capacity,
            tokens: capacity,
            last_refill: Instant::now(),
        }
    }

    fn allow(&mut self) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.last_refill = now;
        self.tokens = (self.tokens + elapsed * self.refill_per_second).min(self.capacity);

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
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

fn parse_usize(value: Option<&str>, default: usize, name: &'static str) -> anyhow::Result<usize> {
    parse_number(value, default, name)
}

fn parse_u32(value: Option<&str>, default: u32, name: &'static str) -> anyhow::Result<u32> {
    parse_number(value, default, name)
}

fn parse_u64(value: Option<&str>, default: u64, name: &'static str) -> anyhow::Result<u64> {
    parse_number(value, default, name)
}

fn parse_f64(value: Option<&str>, default: f64, name: &'static str) -> anyhow::Result<f64> {
    let Some(value) = value else {
        return Ok(default);
    };

    let parsed = value
        .trim()
        .parse::<f64>()
        .with_context(|| format!("{name} must be a number"))?;
    if parsed <= 0.0 {
        return Err(anyhow!("{name} must be greater than zero"));
    }
    Ok(parsed)
}

fn parse_number<T>(value: Option<&str>, default: T, name: &'static str) -> anyhow::Result<T>
where
    T: std::str::FromStr + PartialOrd + From<u8>,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    let Some(value) = value else {
        return Ok(default);
    };

    let parsed = value
        .trim()
        .parse::<T>()
        .with_context(|| format!("{name} must be a positive integer"))?;
    if parsed < T::from(1) {
        return Err(anyhow!("{name} must be greater than zero"));
    }
    Ok(parsed)
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
        assert!(actor.has_capability(SESSION_COMMENT));
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

    #[tokio::test]
    async fn room_capacity_is_enforced_per_room() {
        let config = Config::from_env_map(|key| match key {
            "LABRADOR_DEV_AUTH_BYPASS" => Some("true".to_string()),
            "MAX_ROOM_CONNECTIONS" => Some("1".to_string()),
            _ => None,
        })
        .expect("config should load");
        let state = AppState::new(config);
        let actor = AuthorizedActor {
            actor_id: "user_1".to_string(),
            display_name: None,
            role: Some("editor".to_string()),
            anonymous: false,
            capabilities: vec![SESSION_VIEW.to_string(), SESSION_COMMENT.to_string()],
        };

        state
            .join_room("room_1", None, &actor)
            .await
            .expect("first join should fit");
        let denied = match state.join_room("room_1", None, &actor).await {
            Ok(_) => panic!("second join should exceed capacity"),
            Err(error) => error,
        };

        assert_eq!(denied.code, "rate_limited");
    }

    #[tokio::test]
    async fn trusted_publish_fans_out_and_is_available_for_replay() {
        let config = Config::from_env_map(|key| match key {
            "LABRADOR_DEV_AUTH_BYPASS" => Some("true".to_string()),
            _ => None,
        })
        .expect("config should load");
        let state = AppState::new(config);
        let actor = AuthorizedActor {
            actor_id: "user_1".to_string(),
            display_name: None,
            role: Some("editor".to_string()),
            anonymous: false,
            capabilities: vec![SESSION_VIEW.to_string(), SESSION_COMMENT.to_string()],
        };
        let joined = state
            .join_room("room_publish", None, &actor)
            .await
            .expect("join should work");
        let mut rx = joined.room_tx.subscribe();

        let result = state
            .publish_room_event(
                "room_publish",
                "comment.created",
                Some("user_1".to_string()),
                json!({ "commentId": "comment_1", "body": "hello" }),
            )
            .await;

        assert_eq!(result.seq, Some(1));
        assert_eq!(result.delivered, 1);
        let event = rx.recv().await.expect("published event should fan out");
        assert_eq!(event.event_type, "comment.created");
        assert_eq!(event.seq, Some(1));

        let replay_join = state
            .join_room("room_publish", Some(0), &actor)
            .await
            .expect("rejoin should work");
        assert_eq!(replay_join.replay_events.len(), 1);
        assert_eq!(replay_join.replay_events[0].event_type, "comment.created");
        assert!(!replay_join.replay_requires_resync);
    }

    #[tokio::test]
    async fn reaction_toggle_requires_comment_capability() {
        let config = Config::from_env_map(|key| match key {
            "LABRADOR_DEV_AUTH_BYPASS" => Some("true".to_string()),
            _ => None,
        })
        .expect("config should load");
        let state = AppState::new(config.clone());
        let viewer = AuthorizedActor {
            actor_id: "viewer_1".to_string(),
            display_name: None,
            role: Some("viewer".to_string()),
            anonymous: false,
            capabilities: vec![SESSION_VIEW.to_string()],
        };
        let joined = state
            .join_room("room_reaction", None, &viewer)
            .await
            .expect("viewer should join");
        let (direct_tx, mut direct_rx) = mpsc::channel(4);
        let mut rate_limits = ConnectionRateLimits::new(&config.limits);

        let keep_open = handle_client_text(
            &state,
            "room_reaction",
            &joined.connection_id,
            &viewer,
            &direct_tx,
            &mut rate_limits,
            r#"{"type":"reaction.toggle","eventId":"client-1","payload":{"targetType":"message","targetId":"message_1","emoji":"+1","active":true}}"#,
        )
        .await;

        assert!(keep_open);
        let ack = direct_rx.recv().await.expect("ack should be sent");
        assert_eq!(ack.event_type, "room.ack");
        assert_eq!(ack.payload["clientEventId"], "client-1");
        assert_eq!(ack.payload["accepted"], false);
        assert_eq!(ack.payload["errorCode"], "permission_denied");
    }

    #[tokio::test]
    async fn reaction_toggle_with_comment_capability_broadcasts_update() {
        let config = Config::from_env_map(|key| match key {
            "LABRADOR_DEV_AUTH_BYPASS" => Some("true".to_string()),
            _ => None,
        })
        .expect("config should load");
        let state = AppState::new(config);
        let commenter = AuthorizedActor {
            actor_id: "commenter_1".to_string(),
            display_name: None,
            role: Some("commenter".to_string()),
            anonymous: false,
            capabilities: vec![SESSION_VIEW.to_string(), SESSION_COMMENT.to_string()],
        };
        let joined = state
            .join_room("room_reaction_ok", None, &commenter)
            .await
            .expect("commenter should join");
        let mut rx = joined.room_tx.subscribe();

        let seq = state
            .broadcast_reaction_toggle(
                "room_reaction_ok",
                &joined.connection_id,
                &commenter,
                Some("client-1".to_string()),
                ReactionTogglePayload {
                    target_type: "message".to_string(),
                    target_id: "message_1".to_string(),
                    emoji: "+1".to_string(),
                    active: true,
                },
            )
            .await
            .expect("reaction should be accepted");

        assert_eq!(seq, 1);
        let event = rx.recv().await.expect("reaction event should fan out");
        assert_eq!(event.event_type, "reaction.updated");
        assert_eq!(event.payload["targetId"], "message_1");
        assert_eq!(event.payload["active"], true);
    }
}
