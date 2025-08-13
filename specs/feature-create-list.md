### Feature Spec: Create a New Bluesky List

## Overview
- Add first-class support for creating Bluesky lists directly in the Bluesky List Manager, so users do not need to switch to the Bluesky app.
- Leverage existing authentication (OAuth or App Password) and the same request patterns used for adding/removing list members.

## Goals
- Allow authenticated users to create a new list with:
  - Required: name
  - Optional: description
  - Optional: purpose (default to curated list; allow moderation list as an advanced choice)
- Immediately reflect the new list in the UI and select it to start managing members.
- Provide clear success and error feedback.

## Non-Goals
- Managing list avatars/blobs (can be a future enhancement using `com.atproto.repo.uploadBlob`).
- Editing existing lists (rename/change description/purpose) — may be addressed separately.
- Deleting lists (requires additional confirmation UX and list ownership checks).

## User Stories
- As a user, I can click “New List” from the header, enter details, and create it without leaving the app.
- As a user, after creation, the new list appears in the list selector and is selected, so I can immediately add members.
- As a user, I get descriptive errors if creation fails (e.g., permission issues, validation errors, network failures).

## UX Design
- Entry point: Add a “New List” button next to the list selector in `Header`.
- Modal dialog (`CreateListModal`) with fields:
  - List name (required, single line)
  - Description (optional, multi-line)
  - Purpose (radio or dropdown):
    - Curated list (default) → `app.bsky.graph.defs#curatelist`
    - Moderation list (advanced) → `app.bsky.graph.defs#modlist`
- Actions:
  - Cancel (close modal)
  - Create (disabled until valid name is provided). When clicked, show a loading state.
- Post-create behavior:
  - Close modal on success.
  - Show a small success toast or inline confirmation message.
  - Select the new list in the header dropdown and load its details (member count = 0 initially).
- Error states:
  - Inline error in the modal; stay open so the user can retry or adjust fields.

## Data Model and API Integration
- The app already uses `com.atproto.repo.createRecord` for adding list items. Creating a list uses the same endpoint with a different collection and record type:
  - Endpoint: `com.atproto.repo.createRecord`
  - Inputs:
    - `repo`: current user DID (from session or OAuth `sub`)
    - `collection`: `app.bsky.graph.list`
    - `record`: object with fields:
      - `$type`: `app.bsky.graph.list`
      - `name`: string (required)
      - `description`: string (optional)
      - `purpose`: string (one of `app.bsky.graph.defs#curatelist` or `app.bsky.graph.defs#modlist`)
      - `createdAt`: ISO timestamp
  - Output:
    - Newly created record info, including the list URI (`at://did/app.bsky.graph.list/<rkey>`)

Notes:
- For OAuth sessions, use the `sub` value as `repo` DID (mirrors existing `addToList`/`removeFromList`).
- For App Password sessions, use `session.did` as `repo`.
- Authorization and DPoP handling mirror existing `blueskyApi.makeBlueskyRequest` logic.

## Authentication and Permissions
- Requires authenticated session (OAuth or App Password) — feature should be hidden/disabled when not signed in.
- Uses the logged-in user’s DID as the repository owner for list creation.

## State Management
- On success, update `listStore.userLists` to include the newly created list with:
  - `uri`, `name`, `description`, `purpose`, `createdAt`, and `memberCount: 0`.
- Persist updated lists in `localStorage` (same as current behavior).
- Optionally `setSelectedList(newList)` to immediately navigate to the List Manager view.
- Invalidate any membership caches related to previous selections (as needed). The new list will be empty by default.

## Components Affected
- `Header.svelte`
  - Add “New List” button in the authenticated state, near the list selector.
  - Invokes `CreateListModal`.
  - After success, refresh or update lists and set the selection.
- `CreateListModal.svelte` (new)
  - Modal UI (form: name, description, purpose; loading and error handling; accessible interactions: Esc, focus trap, ARIA labels).
  - Validations: non-empty name; optional length constraints (e.g., name ≤ 64 chars; description ≤ 3–5k chars, safe UI limits).
  - On submit, calls the API method; on success, notifies parent and closes.
- `ListManager.svelte`
  - No changes to core logic; should naturally handle the new selected list with `listItemCount = 0`.
- `ListStatistics.svelte`
  - Display zero metrics initially.

## Error Handling
- API call errors (network, HTTP status, API validation) surfaced in the modal as concise, user-friendly messages.
- Edge cases:
  - Duplicate list names are allowed by Bluesky (handled; we do not enforce uniqueness client-side).
  - Very long inputs: enforce UI limits and show validation messages before submit.
  - Authentication expired: show auth error; prompt to re-sign in.

## Security and Privacy
- Respect existing OAuth + DPoP or App Password mechanisms; no additional secrets.
- Sanitize and validate user inputs client-side (trim, limit length). Avoid logging PII beyond what is already present.

## Performance Considerations
- Single write request per creation; low-frequency operation; no special batching required.
- Avoid full re-fetch of lists if possible by appending the new list to `listStore.userLists`. Optionally, re-fetch lists in the background to reconcile server state.

## Telemetry (Optional)
- Emit simple analytics events (feature used, success/error) if/when analytics are added. Keep minimal and privacy-friendly.

## Accessibility
- Modal must be keyboard accessible (focus trap; Esc to close; aria attributes).
- Form labels and descriptions associated correctly with inputs.

## Testing Plan
- Unit-level:
  - Service method validates inputs and formats the `createRecord` body correctly.
  - Store updates append and select the new list.
- Integration-level:
  - End-to-end happy path (open modal → create list → selected in dropdown → members empty).
  - Error path (simulate API failure → error message remains → user can retry).
  - OAuth and App Password sessions both work.
  - New list appears correctly in `Header` dropdown and `ListStatistics` shows zeros.

## Rollout Plan
- Feature flag not required; small and isolated surface area.
- Ship hidden behind authenticated state only.
- Monitor error rates after release; if needed, add retry/backoff in API layer.

## Dependencies
- Existing `blueskyApi` request/headers/auth abstractions.
- Existing stores: `blueskyStore`, `listStore`.
- Existing UI infrastructure (modals, overlay styles, etc.).

## Work Breakdown (No Code)
1) API Service
- Add a method in `blueskyApi` to create a list via `com.atproto.repo.createRecord` with collection `app.bsky.graph.list` and record fields `$type`, `name`, `description`, `purpose`, `createdAt`.
- Ensure repo DID selection (OAuth vs App Password) mirrors `addToList`.
- Return the created record details (including `uri`).

2) Store Integration
- Extend `listStore` with an action to insert a new list into `userLists` and persist it.
- Optionally select the new list immediately (set `selectedList` and clear membership caches).

3) UI: Header
- Add “New List” button in `Header` (visible when authenticated).
- Wire button to open `CreateListModal`.
- On modal success, update lists and switch selection to the new list.

4) UI: CreateListModal (new)
- Create a modal with fields: name (required), description (optional), purpose (curated default; moderation advanced).
- Validations: name required; apply reasonable max lengths.
- Loading state during submission; error message on failure.
- Emits success event with the created list model (uri, name, description, purpose, createdAt, memberCount=0).

5) Post-Create Refresh
- After selecting the new list, trigger any standard flows that occur on selection (e.g., load list info, confirm `listItemCount = 0`).
- Optionally schedule a background refresh of user lists to confirm server state.

6) Documentation
- Update `README-SVELTE.md` features section and `specs/technical-design.md` to mention list creation.
- Add a brief UX note to `README.md` (Quick Start) about creating lists in-app.

7) QA and Release
- Validate across both auth paths (OAuth/App Password).
- Test on mobile and desktop; confirm modal accessibility and focus handling.
- Prepare a small change log entry.

## Open Questions
- Should we support list avatar upload in v1? (Requires blob upload endpoint and image picker.)
- Should recently created lists be auto-pinned or highlighted in the selector?
- Do we need server-side validation beyond client limits (e.g., profanity filters)?
