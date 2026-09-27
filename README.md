# INTRA_VERSE — Attendee (User) Panel

The **user panel** of the INTRA_VERSE event platform: the authenticated
experience an attendee gets after logging in — dashboard, bookings, tickets,
wishlist, profile, and the browse → checkout → pay flow that produces a ticket.

This repository contains **the user panel and everything it needs to run**.
The organizer and admin surfaces are intentionally not part of this build.

---

## What's inside

```
INTRA_VERSE/
├── client/          React 19 + Vite + Tailwind SPA  (the user panel)
└── server/          Express + MongoDB + Socket.IO API
```

### The panel

| Route            | Page                | What it does                                        |
| ---------------- | ------------------- | --------------------------------------------------- |
| `/dashboard`     | `AttendeeDashboard` | KPI grid, next-event countdown, activity, quick actions |
| `/dashboard/bookings` | `MyBookings`   | Filterable booking list, QR, cancel / request cancel  |
| `/dashboard/tickets`  | `MyTickets`    | Ticket-stub passes, QR, PDF download                  |
| `/dashboard/wishlist` | `Wishlist`     | Saved events, capacity bars, remove                   |
| `/profile`       | `Profile`           | Edit profile, see booking history                     |
| `/events`        | `Events`            | Browse events (the panel links here)                 |
| `/events/:id`    | `EventDetailPremium`| Event detail + register                              |
| `/checkout/:eventId`, `/payment/:eventId`, `/payment-success` | Booking & payment flow |
| `/login`, `/register`, `/auth/callback`, `/pending-approval` | Auth |

`/` redirects to `/dashboard`, so the panel is the front door.

### Design system

The panel has its own **mint/teal** identity, distinct from the other roles in
the wider platform (public = indigo, organizer = violet/fuchsia, admin = blue/cyan).

Tokens live in `client/tailwind.config.js` (`mint-50`…`mint-950`, `glow-mint`,
`hero-glow-mint`) and the shared component layer in `client/src/index.css`:

```
.panel  .panel-hover  .panel-inset  .panel-title  .panel-label  .panel-hairline
.pill   .pill-idle    .pill-active  .pill-indicator
.chip   .search       .btn-mint  .btn-mint-sm  .btn-quiet  .ap-input  .ap-skeleton
```

Reusable panel primitives live in `client/src/components/attendee/`:

| Component        | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `Panel.jsx`      | Glass surface, `PanelHeader`, `ViewAllLink`, `Skeleton` |
| `StatCard.jsx`   | Animated count-up KPI tile with progress bar          |
| `Controls.jsx`   | `Tabs` (sliding indicator), `SearchField`, `Pager`    |
| `EmptyState.jsx` | Empty / no-results state                             |
| `AttendeeSidebar.jsx` | Collapsible grouped nav, tooltips, live counts    |
| `AttendeeTopbar.jsx`  | Page title, ⌘K palette, notifications, avatar menu |

`client/src/hooks/useCountdown.js` exports `useCountdown` (live event countdown)
and `useGreeting`.

### Not included (by design)

`pages/admin/*`, `layouts/AdminLayout.jsx`, `components/admin/*`,
`pages/organizer/*`, `components/dashboard/*`, and the marketing homepage.
`client/src/App.jsx` has been trimmed to the routes listed above.

---

## Setup

Requires **Node 18+** and a running **MongoDB** (and optionally Redis).

### 1. Server

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGO_URI + the JWT/QR secrets
npm run dev
```

### 2. Client

```bash
cd client
npm install
cp .env.example .env      # point VITE_API_URL at your server
npm run dev
```

Client runs on `http://localhost:5173`, API on `http://localhost:5000`.

### 3. Get an attendee account

This build ships no admin bootstrap, so register through the UI at
`/register`. An account with the `attendee` role is what `RoleRoute` requires to
open `/dashboard/*` — accounts with other roles are redirected away.

---

## Environment variables

No real `.env` is committed (see `.gitignore`); only `.env.example` is tracked.

**`client/.env`**

| Variable          | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `VITE_API_URL`    | Base URL of the API                      |
| `VITE_SOCKET_URL` | Socket.IO endpoint for live updates      |

**`server/.env`** — `MONGO_URI`, `REDIS_URL`, `PORT`, `NODE_ENV`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`,
`JWT_REFRESH_EXPIRES`, `QR_SECRET`, `CLIENT_URL`, plus optional
Google OAuth, Cloudinary and SMTP keys. See `server/.env.example`.

> The JWT and QR secrets are what sign the ticket QR codes. Generate fresh
> values for your own deployment — never reuse the placeholders.

---

## How the panel talks to the server

RTK Query slices under `client/src/features/` hold the endpoints; the layout
fetches dashboard counts once and the topbar subscribes to
`useGetNotificationsQuery` for the bell.

| Slice                | Powers                                        |
| -------------------- | --------------------------------------------- |
| `attendee/attendeeApi`  | Dashboard aggregate + counts                |
| `bookings/`          | Booking list, cancel, request-cancel           |
| `checkout/`          | Tickets, order creation                       |
| `wishlist/`          | Saved events, removal                         |
| `notifications/`     | Bell dropdown, mark-all-read                   |
| `auth/`              | Session, login/register, role                 |
| `qr/`                | Ticket QR image + validation                  |

The QR code in `MyTickets` is a JWT-signed PNG issued by the server and fetched
as a base64 image — `QRModal` renders it and offers a PNG download. It is
deliberately **not** generated client-side, so a ticket cannot be forged from
the browser.

---

## Scripts

**client**

```bash
npm run dev       # vite dev server
npm run build     # production build
npm run preview   # serve the build
npm run lint      # eslint
```

**server**

```bash
npm run dev       # nodemon
npm start         # node server.js
```

---

## Stack

React 19 · Vite · Tailwind CSS 3 · Redux Toolkit + RTK Query · React Router 6 ·
Framer Motion · Lucide · Axios · Socket.IO · Express · Mongoose
