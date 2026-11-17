# Smart Farm Web

React + TypeScript + Vite frontend with Tailwind CSS and React Router.
Requires Node.js 22.12+ (Node.js 24 recommended).

## Run locally

From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Run `npm run build` for TypeScript validation and
a production build in `dist/`; use `npm run preview` to serve that build locally.

## Structure

- `public/`: static files served without transformation.
- `src/assets/`: assets imported by application code.
- `src/components/common/`, `dashboard/`, `devices/`, `layout/`: reusable UI.
- `src/pages/`: Dashboard, Devices, Sensors, Irrigation, Alerts, History, Settings,
  Login, and NotFound pages.
- `src/layouts/`: shared page shells using React Router's Outlet.
- `src/hooks/`, `services/`, `types/`, `utils/`: hooks, API access, shared types,
  and utility functions.
- `src/App.tsx`: route definitions; `src/main.tsx`: browser entry point.
- `src/index.css`: shared styles and Tailwind theme.

## Routes

`/` redirects to `/dashboard`. Available routes: `/login`, `/dashboard`,
`/devices`, `/sensors`, `/irrigation`, `/alerts`, `/history`, `/settings`.
Unknown URLs render the 404 page. Navigation highlights the current page.

Most pages are scaffolding: sensor history and automatic irrigation are not implemented.
The dashboard uses authenticated SignalR telemetry/device events when available,
and labels its sample fallback clearly. Login uses the backend authentication API,
and the application routes require an authenticated session.
Original Stitch references are stored in `../../docs/design/stitch/`.

## API configuration

Copy `.env.example` to `.env.local` if configuration is needed and restart Vite.
`VITE_API_BASE_URL` defaults to `http://localhost:5205`, matching the backend HTTP
launch profile. `src/services/api-client.ts` exports a shared Axios instance
with a 15-second timeout. Authentication uses `/api/Auth/login`,
`/api/Auth/refresh-token`, `/api/Auth/logout`, and `/api/Auth/me`. For direct
cross-origin calls the backend must allow the frontend origin through CORS.
Never put credentials in `VITE_*` variables: they are included in browser code.

## Deployment

Configure the web server to serve `index.html` for application routes so that
refreshing a URL such as `/devices` works with BrowserRouter.

## Login and session

Open `/login` and use an account created by the backend. The identity field accepts
an email address or username. Required fields and email format are validated;
the form supports keyboard submission, inline API errors, password visibility,
and a disabled loading state. Successful login stores the access and refresh tokens
in tab-scoped `sessionStorage`, restores the current user with `/api/Auth/me`, and
uses `/api/Auth/refresh-token` when restoring an expired/near-expiry session or
after an authenticated API request returns 401. Concurrent 401 responses share
one refresh request and retry with the rotated access token.
Logout requests refresh-token revocation and clears the local session even if the
server cannot be reached. Passwords are never persisted; tokens are not stored in
`localStorage`.

## Dashboard realtime data

The dashboard loads persisted sensor summary from `GET /api/dashboard/summary`
and connects to the authenticated `/hubs/sensors` SignalR hub with the current
access token. It listens for `TelemetryUpdated` and
`DeviceConnectionStatusChanged`, retries failed connections, and marks realtime
telemetry older than two minutes as stale. When the API or hub is unavailable,
it keeps visibly labeled sample values/statuses. For an online ESP32/controller,
the dashboard offers explicit pump start/stop actions, then polls
`GET /api/commands/{id}` for ESP32-reported status. `Completed` is controller
reported; there is no independent pump-state sensor in the current hardware.
Automated tests mock command responses and never send a live command.

Run `npm test` to check authentication behavior and `npm run build` for production
checks. See `../../docs/testing/issue-6-login.md` for the original login UI criteria.
