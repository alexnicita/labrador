# Security And IAM

This document defines Labrador's security model. Agents MUST follow it when implementing
auth, authorization, share links, realtime joins, comments, runs, or durable writes.

## Security Principles

- Server authority is mandatory.
- Every meaningful action maps to a capability.
- Roles are convenience bundles, not the full security model.
- Share links are grants and MUST be revocable.
- Anonymous access is allowed only through explicit grants.
- Realtime channels MUST enforce the same authorization model as HTTP APIs.

## Roles

Labrador v1 uses these roles:

| Role | Meaning |
| --- | --- |
| `owner` | Ultimate control over a workspace or session. Cannot be silently removed. |
| `admin` | Can manage members, permissions, and share links for the scoped resource. |
| `editor` | Can edit prompts and create AI work within the session. |
| `commenter` | Can view and comment, but not edit prompts or start privileged runs by default. |
| `viewer` | Can view permitted session content. |
| `anonymous_viewer` | Can view through a share link without account identity. |

Additional roles MUST NOT be added until their capabilities are clearly distinct.

## Capabilities

Implementation SHOULD check capabilities, not role names, at mutation boundaries.

Core capabilities:

| Capability | Owner | Admin | Editor | Commenter | Viewer | Anonymous Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| `session.view` | yes | yes | yes | yes | yes | yes if link grants |
| `session.comment` | yes | yes | yes | yes | no | no unless link grants |
| `session.edit_prompt` | yes | yes | yes | no | no | no unless explicit editor link |
| `run.start` | yes | yes | yes | no by default | no | no |
| `run.cancel_own` | yes | yes | yes | no | no | no |
| `run.cancel_any` | yes | yes | no | no | no | no |
| `session.share` | yes | yes | no by default | no | no | no |
| `members.manage` | yes | yes | no | no | no | no |
| `permissions.change` | yes | yes | no | no | no | no |
| `session.delete` | yes | no by default | no | no | no | no |

These defaults MAY be refined later, but agents MUST NOT grant broader access casually.

## Grant Precedence

Effective access MUST be computed on the server from all applicable grants.

V1 SHOULD use this precedence:

1. Explicit revocation, removal, expiration, or disabled account denies access.
2. Direct session membership grants the session role.
3. Workspace membership grants inherited access only when the session allows workspace
   inheritance.
4. Valid share links grant only the role or capabilities encoded on the link.
5. Anonymous access exists only through a valid share link.

When multiple positive grants apply, the server SHOULD use the strongest allowed
capability set after applying revocations and expiration. Share links MUST NOT reduce a
signed-in member's direct access, and they MUST NOT bypass a revocation on the same
resource.

Owners MUST NOT be demoted, removed, or locked out by accident. Any owner transfer or
owner removal behavior MUST require an explicit owner-safe flow.

## Enforcement Points

Authorization MUST be enforced at:

- HTTP API handlers.
- WebSocket room joins.
- WebSocket mutating events.
- AI run start and cancellation.
- Share-link creation, update, and revocation.
- File upload and artifact access.
- Membership and role updates.

Client-side guards MAY improve UX, but they MUST NOT be treated as security.

## Share Links

A share link is a scoped grant. It MUST have:

- A durable id.
- A resource scope, usually workspace or session.
- A role or capability set.
- A secret token shown only in the URL.
- A stored token hash, not the raw token.
- Creator id.
- Created timestamp.
- Optional expiration.
- Optional revoked timestamp.
- Optional requirement for authenticated users.

Share links SHOULD default to `viewer` or `commenter`. Anonymous `editor` links are risky
and MUST require explicit admin/owner intent if supported.

Revoked links MUST stop working for HTTP access and WebSocket joins.

## Anonymous Access

Anonymous users MAY:

- Open sessions through valid share links.
- Count toward anonymous viewer totals.
- Comment only if the share link explicitly grants commenting.
- Edit only if an explicit editor share grant exists.

Anonymous users MUST NOT:

- Manage members.
- Change permissions.
- Create or revoke share links.
- Delete sessions.
- Access sessions without a valid grant.

Anonymous activity SHOULD be auditable as an anonymous principal tied to a link id and
connection/session metadata, without pretending to know a real identity.

## Realtime Security

The realtime service MUST validate join authority before adding a socket to a room.

Realtime event handlers MUST check capabilities for mutating events. A user who can view
is not automatically allowed to comment, edit, start runs, or cancel runs.

Realtime messages MUST NOT leak:

- Private membership lists to anonymous users beyond permitted visible presence.
- Raw share-link tokens.
- Hidden comments or files outside the user's grant.
- Internal model/provider secrets.

## Audit Expectations

Durable audit SHOULD record:

- Permission changes.
- Share-link creation, role changes, and revocation.
- Member invitations and removals.
- AI run starts, cancellations, failures, and completions.
- Destructive actions.

Audit records SHOULD identify actor, target, action, timestamp, and relevant resource ids.

## Abuse And Rate Limits

V1 MUST include a rate-limit plan for:

- Share-link opens.
- Anonymous comments.
- Run starts.
- File uploads.
- Failed auth attempts.

Rate limiting MAY use Upstash Redis or another simple shared store when deployed.

## Tips And Payment Rails

Tips are public to initiate but server-validated. A tip MUST NOT create or change any
Labrador capability, role, membership, share link, run limit, or paid-access state.

Tip routes MUST validate supported amounts on the server, rate-limit requests, and store
only durable non-secret payment metadata. Stripe secret keys, webhook secrets, CDP API
keys, wallet credentials, raw payment signatures, and private keys MUST stay in server-only
deploy secrets and MUST NOT appear in client bundles, public docs, or committed files.

Stripe webhooks MUST verify signatures before updating tip records. x402 endpoints MUST
use facilitator verification and settlement before treating an agent payment as paid.
