# Smart Toll System — Admin Dashboard

Admin web dashboard for the Smart Toll System. This app is built with **Next.js (App Router)** and talks to the Smart Toll **Backend API** for admin authentication, analytics, search, and vehicle-rate management.

**Live Admin Site:** https://smart-toll-admin.vercel.app/

---

## Features

- Admin login (JWT-based via backend)
- Dashboard analytics (users, vehicles, transactions, revenue)
- Users: list/search, view details, view user transactions, update basic profile fields
- Vehicles: list/search, view owner
- Toll transactions: list/search, view details, view owner, view owner’s transactions
- Vehicle rates: view/update toll rate per vehicle type

---

## Tech Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS + shadcn/ui

---

## Prerequisites

- Node.js (18+ recommended)
- A running backend API (local or deployed)

---

## Local Development

### 1) Install dependencies

```bash
cd frontend_admin
npm install
```

### 2) Configure environment variables

Create a file named `.env.local` inside `frontend_admin/`:

```bash
# Backend base URL (the app will call /admin/* under this base)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

# Optional local fallback login (ONLY for development when backend login is unavailable)
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

Notes:

- If `NEXT_PUBLIC_API_BASE_URL` is not set, it defaults to `http://localhost:5000/api` (see `src/config/api.ts`).
- Local fallback auth is only used if the backend login fails or is unreachable.

### 3) Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Backend Integration

This admin app expects these backend endpoints (relative to `NEXT_PUBLIC_API_BASE_URL`):

- `POST /admin/login`
- `GET /admin/analytics`
- `GET /admin/search/users`
- `GET /admin/search/vehicles`
- `GET /admin/search/transactions`
- `GET /admin/vehicle-rates`
- `PUT /admin/vehicle-rates/:id`

Backend auth requirements:

- The backend issues a JWT on `/admin/login` and the admin app stores it in `localStorage` as `adminToken`.
- For backend-based login, the backend must have `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `JWT_SECRET` configured.

---

## Scripts

- `npm run dev` — Start Next.js in development mode
- `npm run build` — Create a production build
- `npm start` — Run the production build
- `npm run lint` — Run ESLint

---

## Project Structure (high level)

- `src/app/login/page.tsx` — Admin login page
- `src/app/dashboard/*` — Admin dashboard pages (analytics, users, vehicles, transactions, vehicle rates)
- `src/context/AuthContext.tsx` — Auth state + login/logout logic (backend first, local fallback)
- `src/config/api.ts` — API base URL + endpoint builders
- `src/components/*` — UI components and dialogs (shadcn/ui)

---

## Deployment (Vercel)

1. Import this folder as a Vercel project (root directory should be `frontend_admin`).
2. Set environment variables in Vercel Project Settings:
	- `NEXT_PUBLIC_API_BASE_URL` → your deployed backend API base URL (e.g. `https://smart-toll-api.vercel.app/api`)
3. Deploy.

Tip: Avoid using `NEXT_PUBLIC_ADMIN_USERNAME` / `NEXT_PUBLIC_ADMIN_PASSWORD` in production, since `NEXT_PUBLIC_*` variables are exposed to the browser.

---

## Troubleshooting

- **“Using local auth - connect to backend for real data”**: You are logged in via local fallback. Set `NEXT_PUBLIC_API_BASE_URL` correctly and ensure the backend is reachable.
- **Login works but pages fail to load**: Check that the backend is returning a valid JWT and that the admin routes accept `Authorization: Bearer <token>`.
