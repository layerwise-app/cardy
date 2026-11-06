<a href="https://layerwise.app"><picture><source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="174" height="28"></picture></a>

# Cardy

Cardy is a Kanban board app for small teams who want to plan work without a heavyweight project tool. Visitors can open a read-only sample board without signing up, then create an account to set up workspaces and boards, move cards between lists, set priorities and due dates, keep checklists, attach files, comment and share boards with teammates. Try the live demo at [cardy.layerwise.site](https://cardy.layerwise.site/).

Cardy was built with [Layerwise](https://layerwise.app), and you can open it in Layerwise to make your own version.

React, TanStack Start and Query, Tailwind CSS, shadcn/ui, Better Auth, Drizzle ORM, Cloudflare D1 and Workers, Layerwise Storage and Email.

## Make it yours

- **Landing page copy**: `src/components/landing/landing-page.tsx` (hero, feature sections, footer). The animated hero board is `src/components/landing/hero-board.tsx`, and the small feature illustrations are in `src/components/landing/feature-fragments.tsx`. The GitHub button's repository link is `REPO_URL` in `src/components/landing/github-button.tsx`.
- **Page titles and descriptions**: the `seo(...)` calls in `src/routes/__root.tsx`, `src/routes/index.tsx` and `src/routes/app.tsx`.
- **Colors and fonts**: theme variables (such as `--primary: #6c47ff`) in `src/styles/app.css`. Landing-page motion lives in `src/styles/landing.css`.
- **Labels and priorities**: `LABELS` and `PRIORITIES` in `src/lib/cardy.types.ts`. To add a label, add `{ name, color }` to `LABELS`; a new color also needs an entry in `LABEL_DOT` in `src/components/cardy/cardy-ui.tsx`.
- **Sample board**: the cards signed-out visitors see are in `src/lib/cardy.demo.ts`. To add a card, add an entry to `entries` with a `title`, `labels`, `list` (index of the list), `priority` and optional `description`, `dueDate` and `checklist`.
- **Limits**: attachment size and count, and signed link lifetime, are constants at the top of `src/lib/cardy.attachments.ts`.
- **Icons**: `public/cardy.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` and `public/site.webmanifest`.
- **Database schema**: `src/db/schema.ts`. Run `pnpm run db:generate` after changing it.

## Routes

- `/` landing page. Old `?board=` and `?invite=` links redirect to `/app`.
- `/app` the app. Signed-out visitors get a read-only sample board. `?board=<id>` opens a board, `&card=<id>` opens a card; `?invite=<token>` shows an invitation.
- `/sign-in`, `/sign-up`, `/sign-in/otp`, `/forgot-password` Better Auth email and OTP.

## Features

- Workspaces with owners and members; expiring, hashed invitation links (no email is sent).
- Boards: private, or public read-only links; duplicate (without attachments), archive and restore.
- Views: Board (drag cards and lists), List (sortable table), Calendar (month grid; drag a card onto a day to set its due date) and Insights (open, overdue, due this week, checklists, cards by list and priority, workload per person).
- Cards: priority (none, low, medium, high, urgent), labels, assignees, due date, checklist, file attachments (up to 50 MB each, image thumbnails), comments and activity.
- Assignment email: when someone assigns you to a card, you get an email with a link to it (verified addresses only).
- Search, filters (label, assignee, priority, due) and My tasks.
- Shortcuts: `/` search, `n` new card, `?` shortcut list, `Esc` close.

## Commands

```sh
pnpm run db:generate   # after schema changes
pnpm run db:migrate    # apply migrations to local D1
pnpm test
pnpm run check-types
pnpm run build
```

Layerwise runs the dev server and applies migrations on publish. `20261013141912_card_priority` adds `card.priority`, converts the old "High priority" label to it and reseeds the sample board. `20261024102654_card_attachments` adds the `attachment` table.

Attachments live in Layerwise Storage (`env.STORAGE`); D1 stores only their keys. Assignment email goes through Layerwise Email (`env.EMAIL`); the local preview never sends it (it shows up under Email → Local in the Layerwise app), and real email starts after the app is published.

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `AUTH_EMAIL_URL` belong in the Worker environment. Without `AUTH_EMAIL_URL`, development OTPs are logged.

## Security

Server functions validate input and resolve the session themselves. Every private read and write checks workspace membership in D1, and owner-only actions are checked on the server. Cross-workspace list, card and assignee references are rejected. Public boards never grant edit access; archived boards and cards are not publicly readable. Writes and their activity records commit in atomic batches.

Attachment uploads and deletes require workspace membership and an active board and card. Files are private: they open through signed links that expire after 15 minutes, issued to members or, on active public boards, to anyone viewing an active card. Assignment email recipients come from D1, never from the browser, and a failed email never fails the save.

`pnpm test` covers the permission matrix, input validation, attachment and assignment email rules, and the pure board logic (filters, sorting, calendar grid, insights).

## Not included

Other email notifications (comments, due dates), reminders and real-time collaboration. Data refetches after mutations and on window focus.

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
