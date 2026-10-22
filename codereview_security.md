# Security Review

No critical or high-severity issues were found. Line numbers are approximate.

## Findings

| #   | Severity   | File:line                                                                  | Finding                                                                                                                                                              | Status                                    |
| --- | ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | Medium     | `src/core/csv.ts:27-29`, `37-51`                                           | CSV formula injection on export: cells starting with `=`, `+`, `@`, tab or CR are not neutralised (`quoteCell`).                                                     | Open                                      |
| 2   | Low–Medium | `src/storage/fileIo.ts:28-30`, `src/components/data/ImportPanel.tsx:84-92` | No size limit on imported files before `file.text()` / `JSON.parse` / CSV tokenising (DoS).                                                                          | **Fixed** (10 MB limit in `readFileText`) |
| 3   | Low–Medium | `src/storage/shareLink.ts:88-106`, `src/core/shareFormat.ts:8`             | Share link allows 2,000,000 characters and 8 MB inflated; no cap on number of sets/pairs in `parseExport`/`parseCsv`.                                                | Open                                      |
| 4   | Low–Medium | `index.html:3-55`                                                          | No Content-Security-Policy (inline script on line 11), no referrer policy.                                                                                           | Open                                      |
| 5   | Low        | `src/router.ts:65-66`, `116-117`; `src/storage/shareLink.ts:25-32`         | Share payload is not validated with a regex and not encoded with `encodeURIComponent`; `atob` throws on malformed input (caught in `useSharedSet.ts`, not verified). | Open                                      |
| 6   | Low        | `src/core/exportFormat.ts:380-560`, `src/core/importPlan.ts`               | Field validation (`readSet`/`readPair`/`readText`) not fully reviewed: length limits, `__proto__` keys, id regeneration.                                             | To verify                                 |
| 7   | Low        | `public/sw.js:33-51`                                                       | Cache-first service worker; a bad deploy may stay cached.                                                                                                            | Open                                      |
| 8   | Info       | `src/storage/fileIo.ts:13-20`                                              | `revokeObjectURL` right after `click()` may abort the download in some browsers.                                                                                     | Open                                      |

## Clean areas

- Secrets/credentials: none found.
- Injection: no `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `window.open` or `postMessage`; no SQL, command execution or path traversal (`vite.config.ts:25-42` only reads build output).
- Logging: only `console.error` without user data (`ErrorBoundary.tsx:27`, `useDatabaseStore.ts:50`).
- localStorage: only theme/language, allow-listed in `index.html:18-43`.

## Fixed

- #2: `MAX_IMPORT_FILE_BYTES` (10 MB) in `src/storage/fileIo.ts`; `readFileText` throws for larger files. The error is caught in `src/hooks/useDataExchange.ts:139-144` and shown as the generic `unreadable` problem; a dedicated "too large" reason would be clearer for users.
- #2 follow-up: `readImportFile` (`src/hooks/useDataExchange.ts`) now checks `file.size` before reading and reports a dedicated `tooLarge` problem, shown as "The file is too large. The limit is 10 MB." (en/sv). The check in `readFileText` remains as a safety net.
