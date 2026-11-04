# Issue #6 — Login validation and navigation

Date: 2026-11-04 (Asia/Ho_Chi_Minh).

## Scope

Responsive Vietnamese login UI, styled consistently with Smart Farm Mini.
Desktop uses a garden illustration panel and login form; mobile uses a single
column. Backend authentication is not implemented: a visible demo account is
used to exercise the form and navigation. JWT, persistence, protected routes,
and authorization remain part of issue #7.

## Automated acceptance evidence

From `frontend/smartfarm-web/`:

```sh
npm ci
npm test
npm run build
```

Validation run: `npm test` passed 1 test file / 5 tests. `npm run build` passed
TypeScript validation and the Vite production build.

Tests: `src/pages/Login/Login.test.tsx` (Vitest + Testing Library + jsdom).

| Scenario | Expected result | Automated result |
| --- | --- | --- |
| Submit empty fields | Required messages and focus on email | Passed |
| Invalid email, then edit | Format error, cleared on edit | Passed |
| Toggle password | Changes visibility without submitting | Passed |
| Incorrect credentials, then retry | Loading disabled state, error, successful retry | Passed |
| Valid demo account, trimmed email | Navigate to Dashboard | Passed |

These are component interaction tests, not real-backend or browser end-to-end
tests. No real device or backend calls are made and no credentials are stored.

## Manual browser checks for review

Not yet performed in this environment; complete before final approval:

- Run `npm run dev` and open `http://localhost:5173/login`.
- Check desktop and mobile layout, readability, and horizontal overflow.
- Use Tab/Shift+Tab and Enter to complete and submit the form.
- Submit empty fields and confirm the field messages are visible.
- Submit a valid-format email with an incorrect password; verify the error.
- Click the demo-fill button and submit; verify `/dashboard` is displayed.
- Check the browser console for runtime errors.
- Attach desktop/mobile screenshots or a short demo video to the PR if desired.

## Review status

Implementation and automated checks completed. Human review and browser visual
checks are pending. This document does not claim issue #7 authentication or
full Definition of Done approval.
