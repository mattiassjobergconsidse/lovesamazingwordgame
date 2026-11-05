# Security Review

NH-19 final quality gate. Line numbers are approximate. No critical or high-severity issue was found. Every finding is
fixed, verified, accepted with a reason, or tracked below.

## Findings

| #   | Severity   | File                                                                     | Finding                                                                                                                              | Status                                                                                                                                                                                                                                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Medium     | `src/core/csv.ts` (`guardCell`, `unguardCell`)                           | CSV formula injection on export: cells starting with `=`, `+`, `-`, `@`, tab or CR were not neutralised.                             | **Fixed.** Such cells get a leading `'`; the import removes it again so words like `-ing` round-trip. Tests: `csv.test.ts`.                                                                                                                                                                                              |
| 2   | Low–Medium | `src/storage/fileIo.ts`, `src/hooks/useDataExchange.ts`                  | No size limit on imported files.                                                                                                     | **Fixed** earlier (10 MB, dedicated "too large" message).                                                                                                                                                                                                                                                                |
| 3   | Low–Medium | `src/core/shareFormat.ts`, `src/storage/shareLink.ts`, `exportFormat.ts` | Share link allowed 2,000,000 characters and an 8 MB inflated payload; no cap on the number of sets or pairs.                         | **Fixed.** `SHARE_MAX_CHARS` 200,000, `SHARE_MAX_INFLATED_BYTES` 2 MB (decompression bomb test), `MAX_IMPORT_SETS` 200 and `MAX_IMPORT_PAIRS` 20,000 in `core/importLimits.ts`, applied to JSON lists, CSV rows and (through `parseExport`) share links.                                                                 |
| 4   | Low–Medium | `index.html`, `vite.config.ts`, `src/core/contentSecurityPolicy.ts`      | No Content-Security-Policy, no referrer policy.                                                                                      | **Fixed.** The build adds a CSP `<meta>` with the SHA-256 hash of the single inline script (checked against `dist/index.html`) and `referrer: no-referrer`. `default-src 'self'`, `object-src 'none'`, no third-party host. Dev server is unaffected. Tests: `contentSecurityPolicy.test.ts`, `tests/indexHtml.test.ts`. |
| 5   | Low        | `src/router.ts`, `src/storage/shareLink.ts`                              | Share payload not validated; `atob` throws on malformed input.                                                                       | **Fixed.** `decodeSharePayload` rejects anything outside the base64url alphabet before decoding; the router already accepts only one path segment. `useSharedSet` maps every failure to the translated "invalid" state (tests in `shareLink.test.ts`, `useSharedSet.test.ts`).                                           |
| 6   | Low        | `src/core/exportFormat.ts`                                               | Field validation not fully reviewed: `__proto__` keys, id regeneration.                                                              | **Verified.** Keys are read by name only, `JSON.parse` creates `__proto__` as an own property (regression test confirms no prototype pollution), and the import plan generates fresh ids.                                                                                                                                |
| 7   | Low        | `public/sw.js`                                                           | Cache-first service worker; a bad deploy may stay cached.                                                                            | **Accepted.** Cache name carries a content hash, the old cache is deleted on activate, `skipWaiting` + `clients.claim` apply a new build on the next load, and the browser re-fetches `sw.js` itself. Only same-origin GET requests are handled.                                                                         |
| 8   | Info       | `src/storage/fileIo.ts`                                                  | `revokeObjectURL` right after `click()` can abort the download; no `try/finally`.                                                    | **Fixed.** `try/finally`, revoke after 10 s, callers show a translated message when the browser refuses (`data.export.failed`). Tests: `fileIo.test.ts`, `useDataExchange.test.tsx`, `tests/dataExchange.test.tsx`.                                                                                                      |
| 9   | Low        | `src/core/exportFormat.ts` (`readPair`)                                  | A single term has no length limit (bounded only by the 10 MB file limit and the 200,000-character share limit).                      | **Tracked.** A limit would reject long sentences users may already have; decide a value with the product owner, then add it with a migration note.                                                                                                                                                                       |
| 10  | Low        | `package.json` (dev dependencies)                                        | `npm audit` reports 13 moderate findings in dev tooling (`minimatch` via typescript-eslint, `@vitest/mocker`) after `npm audit fix`. | **Accepted.** Dev-only, never shipped, no untrusted input reaches them. The fix needs a breaking downgrade of ESLint or a newer Vitest than is published. Re-check when Vitest releases a fix. The one high finding (`undici`) is fixed by the lockfile update.                                                          |

## Dependencies

- `npm audit --omit=dev`: 0 vulnerabilities (the CI gate, `--audit-level=high`, passes). Runtime dependencies are only `react`, `react-dom` and `idb`.
- `npm audit fix` updated `package-lock.json` only (including `undici`); `package.json` is unchanged. The lockfile is committed.

## Secrets and environment

- No secrets, keys or connection strings in the repository or bundle.
- The only environment reads are `import.meta.env.PROD` and `import.meta.env.BASE_URL` in `src/main.tsx`; both are set by Vite and always defined.
- `git ls-files` shows no `.env*`, `coverage/` or `dist/`; `coverage` and `dist` are in `.gitignore`.

## CI/CD (`.github/workflows/deploy.yml`)

- Runs on push and pull requests to `main`; named steps; separate `build` and `deploy` jobs (`deploy` needs `build`).
- Workflow-level `permissions: contents read`; only the deploy job adds `pages: write` and `id-token: write`.
- Official actions are pinned to major versions; `npm ci` uses the lockfile; lint, format check, tests with coverage, audit and build are gates.
- `pull_request` runs get a read-only token and no secrets, so forks cannot reach anything.
- Remaining item: confirm the deploy once by pushing to `main` (cannot be done from this environment).

## Clean areas

- Injection: no `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, `window.open` or `postMessage`; user text is rendered as text.
- No third-party requests, fonts, CDNs or analytics (the CSP now enforces this in production).
- Logging: only `console.error` without user data.
- localStorage: only theme and language, allow-listed in `index.html`.

## Manually verified

- Chrome, `npm run preview`, offline: the app shell, script, stylesheet, manifest, icons and mascot load from the service worker and the console shows no CSP violations. This check found and fixed an offline bug: cache lookups now use `ignoreVary` (NH-1, `tests/serviceWorkerSource.test.ts`).
- Chrome, `npm run preview`, online: training modes (including Listening), theme switch, export (set and CSV), import, share link and print produce no CSP violations in the console.

## Not verifiable here

- CSP behaviour in a second browser (Firefox, Safari).
- Service worker update flow across two real deployments.
