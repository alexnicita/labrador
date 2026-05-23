# AI Behavior

This document defines how Labrador should run and display LLM and agent work.

## AI Product Role

AI is a collaborator inside a shared session. Its work MUST be visible, attributable, and
recoverable by permitted users.

Labrador SHOULD avoid private invisible agent state when the result affects the shared
session.

## Run Lifecycle

An AI run SHOULD move through explicit states:

- `queued`
- `running`
- `waiting_for_tool`
- `waiting_for_approval`
- `completed`
- `failed`
- `cancelled`

V1 MAY omit states that are not yet implemented, but it MUST distinguish running,
completed, failed, and cancelled.

## Starting Runs

Starting a run MUST require server-side `run.start` capability.

Run creation SHOULD persist before output streaming begins. The run record should include
the starter actor, session id, input reference, and initial status.

## Streaming

AI output SHOULD stream to the initiating user and to all permitted session viewers.

Shared run fanout SHOULD go through the realtime service. HTTP streaming from a Vercel
route MAY serve the initiating client, but other collaborators MUST not depend on polling
to watch a run.

Output SHOULD be batched into readable chunks. The system MUST NOT broadcast one event per
model token under normal operation.

## Tool Use

When AI uses tools, Labrador SHOULD expose enough state for collaborators to understand
progress without leaking secrets.

Tool events MAY include:

- Tool name or safe display label.
- Start and finish status.
- High-level result summary.
- Approval request when needed.

Tool events MUST NOT include credentials, private environment variables, or hidden system
prompts.

## Cancellation

Run cancellation MUST be permissioned.

The system SHOULD support:

- Starter can cancel own active run where safe.
- Admin/owner can cancel any active run.
- UI shows cancellation in progress.
- Durable run state records cancellation.
- Realtime room receives `run.status` update.

## Failure

Run failures MUST be visible to collaborators with access to the run.

Failure records SHOULD include:

- Safe error code.
- Safe message.
- Whether retry is possible.
- Timestamp.

Raw provider errors SHOULD be sanitized before display if they contain secrets or internal
details.

## Approvals

Future agent actions that can mutate external systems, spend money, change permissions,
or publish externally SHOULD require explicit approval.

Approval prompts SHOULD identify:

- Requested action.
- Requesting run.
- Actor who can approve.
- Consequences.

## Auditability

Runs SHOULD leave enough durable trace to explain:

- Who started the run.
- What input was used.
- What output was produced.
- Whether tools were called.
- Whether a human approved or cancelled anything.

Do not persist chain-of-thought. Persist user-visible reasoning summaries, steps, tool
events, outputs, and decisions.

