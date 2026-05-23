# Operating Mode

Labrador is on a tight deadline. Agents MUST move quickly, but speed is not permission to
write vague, fragile, or insecure code.

## Core Rule

Ship the smallest correct implementation that preserves velocity.

Correct means:

- Security boundaries are server-enforced.
- Realtime hot paths stay fast.
- Names match the brain docs.
- CI passes.
- The deployed product still works.

## Decision Defaults

When blocked by a minor ambiguity, agents SHOULD choose the documented default and keep
moving. Ask only when the decision materially changes product scope, security, data shape,
or deployment cost.

Default choices:

- Use Next.js App Router for frontend.
- Use Rust for realtime backend.
- Use Postgres for durable authority.
- Use WebSockets for live collaboration.
- Use HTTP-first durable mutations for comments, runs, memberships, and share links.
- Use simple explicit types before abstractions.
- Use one-region deployment before multi-region complexity.

## Work Style

Agents MUST:

- Inspect before editing.
- Avoid unrelated refactors.
- Keep commits coherent.
- Prefer direct implementation over speculative framework work.
- Add tests at the boundary most likely to fail.
- Verify locally before pushing when practical.
- Keep the user informed with short, useful updates.

Agents MUST NOT:

- Stall on perfect architecture diagrams.
- Add infrastructure for hypothetical scale.
- Hide broken tests.
- Commit secrets.
- Rewrite unrelated user work.
- Use the database as the realtime transport.
- Build a landing page when the app surface is requested.

## Fast Path For New Features

Use this sequence:

1. Read the governing brain docs.
2. Identify the product primitive.
3. Implement the smallest vertical slice.
4. Add or update a focused test.
5. Run the relevant checks.
6. Verify in browser or API client when user-facing.
7. Commit and push when requested.

## Quality Under Speed

The deadline makes quality more important, not less. Bad foundations slow every future
task. Agents SHOULD trade optional features for cleaner boundaries, clearer names, and
working deployment.

## Stop Conditions

Agents SHOULD stop and surface the issue when:

- A permission decision is ambiguous and could expose private data.
- A migration could destroy user data.
- A deployment command needs unavailable credentials.
- Existing user work conflicts with the requested change.
- The proposed shortcut would make the realtime or IAM model incoherent.

