# Glossary

Agents MUST use these terms consistently in code, docs, routes, events, and UI.

## Actor

An entity that performs an action. An actor may be an authenticated user, anonymous
viewer, system process, or AI agent.

## Admin

A role that can manage members, permissions, and share links for its scope.

## Agent

An AI system or coding assistant performing work inside or for Labrador. Do not use
`agent` to mean a human collaborator.

## Agent Run

One execution of AI work in a session. Prefer `run` in UI and event names when context is
clear.

## Anonymous Viewer

An unauthenticated viewer using a share link. Anonymous viewers may be counted in
aggregate and may have limited capabilities if the share link grants them.

## Artifact

A generated or curated output that can be inspected, referenced, downloaded, versioned,
or used by later runs.

## Branch

An alternate direction of work from a session, prompt version, run, or artifact.

## Capability

A specific permission to perform an action, such as `session.comment` or `run.start`.
Capabilities are enforced server-side.

## Comment

Durable human feedback anchored to a stable target.

## Editor

A role that can edit prompts and create AI work inside a session.

## File

Uploaded context or source material associated with a workspace or session.

## Membership

Durable relationship between a user and a workspace or session, usually with a role.

## Owner

The highest-control role for a workspace or session.

## Presence

Ephemeral realtime connection state showing who is currently in a session and what they
are doing. Presence is not durable membership.

## Prompt Draft

The editable prompt or instruction being collaboratively shaped.

## Prompt Version

A durable checkpoint of meaningful prompt state.

## Realtime Service

The Rust service on Railway responsible for WebSocket rooms, presence, live draft patches,
viewer counts, and AI run fanout.

## Role

A named bundle of capabilities, such as owner, admin, editor, commenter, viewer, or
anonymous viewer.

## Room

The realtime connection space for a session. A room is not the durable session itself.

## Run

Short form of agent run.

## Session

The primary shared AI work container. A session owns prompts, runs, messages, comments,
versions, branches, files, artifacts, membership, and share grants.

## Share Link

A URL-bearing grant that allows access to a resource. The secret token is shown in the
URL and stored only as a hash.

## Viewer

A participant with `session.view`. Viewers may be authenticated and visible, or anonymous
and counted in aggregate.

## Workspace

A higher-level container for users and sessions.

