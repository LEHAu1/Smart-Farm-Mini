# Authentication E2E Test Report

**Initial test date:** 2026-11-22
**Environment:** local frontend `http://127.0.0.1:5173`, API `http://localhost:5205`, Development SQL Server database configured as `SmartFarmMiniDb`.
**Test data:** no account was created and no database rows were changed. The login probe used a synthetic email ending in `@invalid.example` that is not associated with a real person.

## System health

| Check | Result | Evidence |
|---|---|---|
| Frontend loads | PASS | Chrome opened Login and Register routes; Vite served both. |
| API liveness | PASS | `GET /health/live` returned `200` and `status: Alive`. |
| API readiness | PASS with caveat | `GET /health/ready` returned `200`, database Ready, MQTT Connected. Readiness did not detect the missing auth columns. |
| Guest route guard | PASS | Direct `/dashboard` navigation redirected to `/login?returnUrl=%2Fdashboard`. |
| Empty login form | PASS | Required fields were marked invalid; no login request was sent. |
| Empty registration form | PASS | Required fields were marked invalid; no registration request was sent. |
| Invalid registration email | PASS | Browser marked the email invalid and did not call the API. |
| Registration password policy | PASS after frontend fix | An 8-character uppercase-only password was rejected in the UI with an alert and no API write. |
| Invalid login credentials against API | FAIL | A synthetic nonexistent identity produced `POST /api/Auth/login` → `500`, not the expected authentication rejection. SQL reports missing `AspNetUsers.AuthProvider`, `AvatarUrl`, and `GoogleSubjectId`. |
| Successful registration/login | PASS (user-reported) | User confirmed the Swagger registration and login calls returned the expected results on the local API/DB. |
| Refresh/logout/reuse E2E | PASS (user-reported; screenshots observed) | User confirmed the full Swagger flow. Evidence screenshots show logout `204` and a later refresh request rejected with `401` reuse detection. |
| Google sign-in | NOT VERIFIED | Google Identity calls returned `403`; browser reported that the current origin is not allowed for the configured client ID. |

## Automated verification

| Command | Result |
|---|---|
| `npm test` | PASS, 8 files / 23 tests, including current auth and device UI tests. |
| Targeted backend auth/token tests | PASS, 17/17 using isolated output and EF Core 10 tooling. |
| `npm run build` | PASS; typecheck and Vite production build succeeded. Vite emitted a non-blocking chunk-size warning (>500 kB). |
| Full backend UnitTests | NOT VERIFIED. Isolated build compiled all test projects, but VSTest could not connect to `testhost` after 90 seconds. The default output is also locked by the running WebAPI process; it was not stopped. |
| `git diff --check` | PASS. |

## Migration verification (read-only)

Revalidated on 2026-11-23.

| Check | Result | Evidence |
|---|---|---|
| Generate idempotent SQL with EF Core CLI 10.0.13 | PASS | Generated script contains guarded `COL_LENGTH` additions for the three auth columns, null `AuthProvider` backfill, filtered unique Google subject index, and migration history insertion. Script was inspected, not executed. |
| `migrations has-pending-model-changes` | FAIL | EF reports pending model changes. A generated temporary probe showed these are existing non-auth model differences: device soft-delete fields, several constraints/indexes and FK delete behavior. Probe files were not retained and the snapshot was restored. |
| `migrations list` against configured local DB | NOT VERIFIED | EF could list source migrations but could not connect to SQL Server LocalDB (`Local Database Runtime error 50`); it could not determine applied status. No database was changed. |

The user later confirmed successful Swagger registration, login, current-user, refresh, logout, and revoked-token checks. Their SQL screenshots show the three auth columns and filtered unique index exist in `SmartFarmMiniDb`; a query for `dbo.__EFMigrationsHistory` returned `Invalid object name`. The auth schema is therefore present, but EF migration history is not recorded/verified. All migrations still show Pending; do not run `database update` against this existing database until its schema is baselined safely.

## Browser evidence

- Chrome was paired through Browser MCP and used for the local frontend/API.
- `GET /health/ready` returned database Ready and MQTT Connected.
- The login failure response body included SQL Server error 207 for the three missing auth columns; no registration request was sent.
- After the route-loading fix, Chrome showed the API's generic error (`Đã có lỗi hệ thống xảy ra.`) and preserved the entered synthetic email/password when the same backend schema error occurred. Stack details were not displayed.
- Browser also logged Google Identity `403` responses, separate from email/password login.

## Acceptance status

Frontend validation, route-guard behavior, visible error handling, targeted backend auth/token unit tests, and Swagger auth E2E are verified (Swagger E2E based on the user's report and screenshots). The auth columns/index exist, but the auth migration is not recorded in `__EFMigrationsHistory`; all migrations appear Pending because that history table is absent. The overall EF model also has pending non-auth schema differences. Runtime auth flow passes, while EF migration history/baselining remains unresolved.
