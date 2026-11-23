# Authentication Bug Report

**Date:** 2026-11-22
**Scope:** local authentication UI, API contract, backend persistence mapping, and current development database.
**Changes:** findings verified with repository source, Browser MCP, and independent read-only review. No live database migration or account creation was performed.

| ID | Component | Finding | Severity | Status / verification |
|---|---|---|---|---|
| AUTH-001 | Backend EF schema / login | At the original browser test, `POST /api/Auth/login` returned `500` because that API connection's `AspNetUsers` table lacked `AuthProvider`, `AvatarUrl`, and `GoogleSubjectId`, although the EF model selected them. | RUNTIME FIXED / MIGRATION HISTORY UNRESOLVED | Confirmed in the 2026-11-22 Chrome response. On 2026-11-23, the user reported the Swagger register/login/refresh/logout flow passed; SQL screenshots show the three columns and filtered index now exist. `dbo.__EFMigrationsHistory` is absent, so EF still reports all migrations Pending. |
| AUTH-002 | Frontend session restore | A cached user was treated as authenticated when `/api/Auth/me` failed; `auth:unauthorized` from failed refresh did not clear in-memory auth state. | HIGH | Source fixed; focused AuthContext tests pass. Independent source review agrees. Browser E2E with a valid session is not verified. |
| AUTH-003 | Registration validation | UI allowed passwords with length >=8 that lack a lowercase letter or digit, while ASP.NET Identity requires both. | MEDIUM | Source fixed; browser rejected uppercase-only sample locally without API call; automated validator tests pass. |
| AUTH-004 | Auth token storage | README and issue-6 docs described tab-scoped `sessionStorage`, while implementation used persistent `localStorage`. | MEDIUM | Auth token, refresh token, and user now use `sessionStorage`; legacy auth keys are removed from localStorage at startup; tests cover the storage contract. |
| AUTH-005 | Login error visibility | Actual Chrome login against the schema-broken API returned `500`, but no visible alert appeared and fields reset. Login toggled global `isLoading`, causing `PublicRoute` to unmount LoginPage during the request. | MEDIUM | Fixed: `isLoading` now tracks only initial auth hydration. Integrated `AuthProvider + PublicRoute + LoginPage` test passes; Chrome now shows an alert and preserves form values after the same 500 response. |
| AUTH-006 | Google OAuth configuration | Google Identity endpoint rejected the configured client/origin with `403` (`origin is not allowed`). | LOW / integration blocker | Confirmed in Chrome Console. Requires a Google Cloud OAuth Client ID authorized for the exact local origin; no OAuth configuration was changed. |
| AUTH-007 | API documentation | Signup mapping listed a client-supplied `role`, but `RegisterRequest` has no role field and backend assigns `User`. | LOW | Documentation corrected to match the DTO and service behavior. |

## False-positive checks

- The `401`/bad-credentials path could not be observed because the database fails during Identity lookup first; the live request returns `500` due to schema drift.
- Google `403` errors are separate from the local email/password API path.
- `GET /health/ready` returning Ready does not prove that all application tables/columns match the EF model.
- No user's existing account was used, locked out, changed, or removed.
