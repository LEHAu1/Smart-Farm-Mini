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

Pages are scaffolding: authentication, sensor data, and hardware commands are
not implemented. Login is a placeholder and routes are not protected yet.
Original Stitch references are stored in `../../docs/design/stitch/`.

## API configuration

Copy `.env.example` to `.env.local` if configuration is needed and restart Vite.
`VITE_API_BASE_URL` defaults to `http://localhost:5205`, matching the backend HTTP
launch profile. `src/services/api-client.ts` exports a shared Axios instance
with a 15-second timeout. Endpoint contracts are not assumed. For direct
cross-origin calls the backend must allow the frontend origin through CORS.
Never put credentials in `VITE_*` variables: they are included in browser code.

## Deployment

Configure the web server to serve `index.html` for application routes so that
refreshing a URL such as `/devices` works with BrowserRouter.
