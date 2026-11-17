# Issue #6 — Login validation and navigation

Date: 2026-11-04 (Asia/Ho_Chi_Minh).

Update 2026-11-16: the frontend now uses the backend JWT endpoints. The demo
account flow below is historical evidence from the original issue run and is
no longer present in the application.

## Scope

Responsive Vietnamese login UI styled consistently with Smart Farm Mini. The
frontend authenticates through the backend JWT API, keeps a tab-scoped session,
protects application routes, and clears the local session on logout. Browser
session storage is a convenience and not an XSS security boundary.

## Automated acceptance evidence

From `frontend/smartfarm-web/`:

```sh
npm ci
npm test
npm run build
```

Validation run for the current frontend: `npm.cmd test` passed 5 test files /
21 tests. `npm.cmd run build` passed TypeScript validation and the Vite
production build. An independent verifier reran both checks successfully.

Tests: `src/pages/Login/Login.test.tsx` (Vitest + Testing Library + jsdom).

| Scenario | Expected result | Automated result |
| --- | --- | --- |
| Submit empty fields | Required messages and focus on email | Passed |
| Invalid email, then edit | Format error, cleared on edit | Passed |
| Toggle password | Changes visibility without submitting | Passed |
| Incorrect credentials, then retry | Loading disabled state, error, successful retry | Passed |
| Valid API response | Store tab-scoped session and navigate to Dashboard | Passed by auth component/service tests |
| Protected route without session | Redirect to Login and preserve requested route | Passed |
| Concurrent protected API 401s | Share refresh and retry with rotated token | Passed |
| Refresh failure | Clear session and return to Login | Passed |

These are component/service tests using mocked HTTP responses, not real-backend
or browser end-to-end tests. No real device calls are made.

## Manual browser checks for review

Not yet performed in this environment; complete before final approval:

- Run `npm run dev` and open `http://localhost:5173/login`.
- Check desktop and mobile layout, readability, and horizontal overflow.
- Use Tab/Shift+Tab and Enter to complete and submit the form.
- Submit empty fields and confirm the field messages are visible.
- Submit a valid-format email with an incorrect password; verify the error.
- Sign in with a real backend-created account; verify `/dashboard` is displayed.
- Check the browser console for runtime errors.
- Attach desktop/mobile screenshots or a short demo video to the PR if desired.

## Review status

Implementation and automated checks completed. SQL-backed login and interactive
browser visual checks remain unverified in this environment. The app no longer
accepts demo credentials as real authentication.
