# Cardy

A thoughtfully simple task manager, independently implemented with original branding and UI. MIT licensed. Kan's public product interface and documented workflows were used only as behavioral research; no Kan source, CSS, copy, or assets are included.

## Stack

React, TypeScript, TanStack Start and Query, Tailwind CSS, shadcn/ui, Better Auth, Drizzle ORM, and Cloudflare D1 / Workers. Existing Layerwise preview, deployment, database, and authentication email integrations are retained. No new runtime dependencies were added.

## Setup And Checks

```sh
pnpm run db:generate
pnpm run db:migrate
pnpm test
pnpm run check-types
pnpm run build
```

Layerwise manages the development server. Do not start or restart another server. Local D1 requires generated migrations before authenticated workspace features work. Layerwise applies the same Drizzle migrations to production on publish. Publish through the existing Layerwise deployment integration.

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL` belong in the Worker environment, never in client-prefixed variables. The existing `sendAuthEmail` integration delivers OTPs; without `AUTH_EMAIL_URL`, development OTPs are logged. Delivery failures are shown in the authentication dialog.

## Flows And Permissions

- Visitors see an explicitly read-only sample board. A predefined public fixture is initialized idempotently on the server; a local read-only fixture also keeps the preview usable when D1 is unavailable. Failed requests remain visible, and no failed writes are simulated as successful.
- Sign in or create an account, then create a workspace. Each workspace starts with a private board and four lists. Switch workspaces and boards in the sidebar.
- Owners manage workspace names, invitations, membership, board visibility, and board archiving. Members create and duplicate boards, organize lists and cards, edit card details, and comment. Workspace ownership cannot be removed.
- Invitations use owner-shared, expiring links, not automatically sent email. Tokens are hashed at rest. Accepting requires an authenticated, verified matching email. Owners can revoke links. Auth verification uses the existing Better Auth email OTP plugin.
- Public active boards can be viewed without authentication. All mutations still require membership; public visibility never grants edit access. Archived boards and archived cards are not publicly readable. Public views expose member display names and card conversations, but not emails, invitation records, or authentication data.
- Drag cards or list headings on desktop. Move menus and the card detail list selector support touch and keyboard use. Ordering and related activity are stored in atomic D1 batches.
- Card details include descriptions, fixed compatible labels, workspace-member assignees, dates, editable checklists, comments, and activity. Save details explicitly; closing a dirty card prompts before discarding. Comments are saved independently.
- Search matches card titles, descriptions, labels, and checklist text on the current board. Filters cover labels, assignees, and due dates. My tasks shows assignments on the current board.
- Duplicated boards are private and copy active lists/cards/checklists, not comments or prior activity. Archived boards are restored from the archive view.

## Security And Verification

Server functions validate inputs and resolve the authenticated session independently. Every private read and write checks database-backed workspace membership. Cross-workspace list, card, assignee, invitation, and member references are rejected. Owner-only operations are checked on the server. TanStack Start CSRF middleware protects server-function requests. Changes and their activity records are committed in atomic batches.

`pnpm test` covers the read/write permission matrix and input-validation boundary cases. These are unit tests, not a substitute for the following D1/browser integration checks after migrations:

1. Create two accounts and two isolated workspaces; verify private board links reject outsiders.
2. Invite the second account, verify its email by OTP, and accept the matching link. Verify a wrong email, expired/revoked link, and reused link are rejected.
3. Verify members can edit but cannot invite, remove owners, change visibility, or archive boards.
4. Add and reorder lists/cards, reload, and verify ordering, details, checklists, comments, and activity persist.
5. Verify foreign card/list IDs and nonmember assignees are rejected by server functions.
6. Make a board public and view it signed out; verify all edits remain denied. Archive it and verify the old public link is denied.
7. Duplicate and restore boards, then test narrow layouts, keyboard move controls, filtering, loading/error states, and auth delivery errors.

Attachments, external integrations, and real-time collaboration are intentionally deferred. The app refetches persisted data after mutations and on window focus; it does not claim live collaboration.
