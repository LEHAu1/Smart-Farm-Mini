# Authentication Fix Summary

**Initial fix date:** 2026-11-22
**Branch:** `feature/iot-end-to-end-integration`
**Commit/push:** none.

## Source changes

- Added a guarded EF migration for `AspNetUsers.GoogleSubjectId`, `AuthProvider`, `AvatarUrl`, and the filtered unique Google subject index. It is compatible with SQL script `03_AddGoogleAuth_v2_2.sql` already having added these columns. Its `Down` intentionally leaves the additive columns/index in place so rolling back the EF migration cannot erase auth metadata created by the manual script.
- Removed cached-profile fallback as proof of authentication. Failed `/api/Auth/me` initialization now leaves the user unauthenticated, and failed refresh clears the in-memory auth state through `auth:unauthorized`.
- Aligned auth token/user storage with documented tab-scoped `sessionStorage`; unrelated localStorage preferences are untouched.
- Enforced the backend password-creation policy (minimum 8 characters, lowercase letter, and digit) on registration. Login only requires a non-empty password so existing passwords are not rejected by creation-time rules.
- Corrected the signup API mapping: the backend assigns `User`; signup does not accept a `role` field.
- Added focused tests for auth state, storage, password validation, and visible login errors.
- Fixed a route lifecycle bug: auth `isLoading` now represents initial session hydration only. Login/register forms remain mounted during requests, so failed-login alerts and form values persist.
- Login error mapping now displays the API's generic `error` message while ignoring development-only `details`/stack traces.

## Verification

Migration and auth revalidation: 2026-11-23.

- Frontend full test suite: 23 passed across 8 files; `npm run build` and typecheck passed (Vite retains the non-blocking >500 kB chunk warning).
- Targeted backend auth/token unit tests: 17 passed. Full backend suite remains unverified because VSTest did not connect to the isolated `testhost` within 90 seconds; the ordinary output is locked by the running WebAPI process.
- EF Core 10.0.13 generated an idempotent SQL script for the new auth migration; guarded columns/index and AuthProvider backfill were confirmed in the generated script. The script was not applied.
- EF reports pending model changes unrelated to auth (device soft-delete columns and existing constraints/indexes/FK behavior). A temporary probe isolated the differences; the model snapshot was restored afterward.
- `migrations list` could not query the configured LocalDB instance (Local Database Runtime error 50), so whether the auth migration is recorded/applied remains unknown. No database rows/schema were changed.
- The user subsequently confirmed the Swagger registration, login, current-user, refresh, logout, and revoked-token checks returned expected outcomes. SQL screenshots show auth columns/index exist, but `dbo.__EFMigrationsHistory` is absent; all EF migrations still appear Pending. Runtime E2E passes, EF migration baselining remains unresolved.
- Browser verified frontend routes, empty/invalid registration validation, guest route protection, and visible login error handling. A unique nonexistent login request reproduced the database 500; after the UI fix, the error alert and form values remain visible.
- No live database writes, account creation, migrations, commits, or pushes were performed.

## Remaining operator action

Do not run `dotnet ef database update` against the existing `SmartFarmMiniDb` while all migrations appear Pending and the history table is absent; it could attempt the initial schema creation. Reconcile/baseline the manually created schema with the EF migration chain first. The overall EF model also has pending non-auth differences to compare with existing SQL scripts. Google sign-in separately requires an OAuth client configured for the exact frontend origin.
