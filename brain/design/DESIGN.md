# Design

This document defines Labrador's product and interface design rules. It is written for
agents implementing UI, interaction behavior, and user-facing states.

## Product Surface

The primary screen is a shared AI session. It SHOULD support:

- A session title and share/status controls.
- Visible collaborators and aggregate viewer counts.
- A main work thread or prompt/output surface.
- AI run status and streamed output.
- Comments, activity, and participants in a side panel on wide screens.
- Versions and branches where users can understand how work evolved.
- Permission-aware composer and controls.

The interface MUST feel like a work surface, not a landing page.

## Layout Principles

Desktop SHOULD favor a three-zone layout:

- Navigation/session context.
- Main session work area.
- Collaboration panel for comments, activity, participants, or permissions.

Mobile SHOULD collapse into a focused session view:

- Main work first.
- Comments and activity behind tabs or sheets.
- Share and permissions accessible but not dominant.
- Composer controls reachable with one hand where practical.

Agents MUST NOT hide critical run status, permission state, or comments only because the
viewport is narrow.

## Collaboration Signals

The UI MUST distinguish:

- Named collaborators currently present.
- Anonymous viewers counted as an aggregate.
- Users with view/comment/edit/admin roles.
- AI work that is running, paused, failed, cancelled, or complete.
- Local pending actions versus server-confirmed actions.

Presence SHOULD be visible but not distracting. Cursors and selections MAY be shown in
shared editing surfaces, but they MUST NOT obscure content or controls.

## Permission-Aware UI

Every mutating control MUST reflect the user's effective capability:

- Viewers can inspect but not mutate.
- Commenters can comment and react but not edit prompts or start runs unless granted.
- Editors can edit prompts and create work artifacts.
- Admins can manage members and sharing.
- Owners retain ultimate control.

Disabled controls SHOULD explain why the action is unavailable. Hidden controls MAY be
used for actions that would create clutter, but hiding a control MUST NOT be the only
security enforcement.

## Comments And Activity

Comments MUST be anchored to the session, a message/output, a prompt version, or another
durable target. Floating comments without a stable target SHOULD be avoided.

The comment UI SHOULD support:

- Threaded replies.
- Resolve or archive behavior later.
- Reactions where useful.
- Clear author, timestamp, and role context.
- Permission-aware reply composer.

Activity should summarize meaningful durable events, not noisy presence churn.

## Versions And Branches

Version UI SHOULD help users answer:

- What changed?
- Who changed it?
- When did it change?
- Which run or prompt produced this artifact?
- Can I branch from here?

Branches SHOULD be understandable as alternate directions of AI work, not source-control
complexity exposed raw.

## Share Experience

Sharing MUST be fast. The share UI SHOULD make the safe path obvious:

- Copy viewer link.
- Invite by email or account.
- Upgrade link permission intentionally.
- Revoke link.
- Show whether anonymous access is enabled.

The product SHOULD bias share links toward viewer or commenter access. Anonymous editor
links are high risk and MUST require explicit admin/owner action if supported.

## Mobile Rules

Mobile UI MUST:

- Fit core session reading and commenting.
- Show whether the user is anonymous or authenticated.
- Make share-link access understandable.
- Keep run status visible during streaming.
- Avoid tiny tap targets for comment, share, send, and permission controls.

Mobile MAY simplify dense version browsing, but it MUST still expose history enough for
trust and context.

## Visual Tone

Labrador SHOULD feel focused, fast, and professional. Avoid decorative UI that slows down
the work surface.

Agents building frontend SHOULD prefer:

- Dense but legible information layout.
- Clear tabs for comments/activity/participants.
- Stable component dimensions for realtime content.
- Accessible contrast and keyboard navigation.
- Direct labels for permission and run states.

Agents MUST NOT build a marketing landing page when asked to build the app experience.

