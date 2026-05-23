# Testing

This document defines Labrador's testing mindset. Agents MUST choose tests based on the
risk of the change.

## Testing Principles

- Test behavior at subsystem boundaries.
- Prioritize IAM, realtime, and data integrity.
- Verify mobile and collaboration UI states when frontend changes are user-facing.
- Prefer focused tests over broad brittle snapshots.
- Document any meaningful untested risk in the final response.

## IAM Tests

Permission changes MUST include tests for allowed and denied actions.

Tests SHOULD cover:

- Owner/admin/editor/commenter/viewer capability differences.
- Anonymous share-link grants.
- Revoked share links.
- Permission changes taking effect on HTTP APIs.
- Permission changes affecting realtime joins or mutating events.

## Realtime Tests

Realtime changes SHOULD test:

- Join authorization.
- Presence snapshot.
- Broadcast to all room members.
- Rejection of unauthorized events.
- Reconnect or resync behavior.
- Slow or invalid client handling where practical.

Full browser tests MAY be used for collaboration flows once UI exists.

## AI Run Tests

AI run changes SHOULD test:

- Run creation authorization.
- Status transitions.
- Streaming chunk fanout.
- Cancellation.
- Failure state.
- Durable output recovery.

Provider calls SHOULD be mocked unless the test is explicitly an integration smoke test.

## Data Tests

Data changes SHOULD test:

- Migrations apply cleanly.
- Constraints protect ownership and uniqueness.
- Token hashes are stored instead of raw share-link tokens.
- Soft-deleted or revoked records do not grant access.
- Queries return only authorized scoped data.

## Frontend Tests

Frontend changes SHOULD test or manually verify:

- Viewer/commenter/editor/admin UI differences.
- Mobile session view.
- Disconnected realtime state.
- Pending optimistic actions.
- Comment and run status rendering.
- Long streamed output without layout breakage.

## Documentation Tests

When changing brain docs, agents SHOULD check:

- No contradiction with implementation-critical docs.
- Terms match `../engineering/GLOSSARY.md`.
- New rules are actionable for code.
- Cross-links point to the canonical document.

## Acceptance Standard

A change is acceptable when the most likely regression path has been tested or explicitly
verified. If tests cannot be run, agents MUST say why and describe the remaining risk.
