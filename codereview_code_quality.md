# Code Quality Review

NH-19 final quality gate. Scope: `src/` (excluding tests), plus build and CI.

## Gate results

| Check                                             | Result                                                                                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint` (strictTypeChecked + stylistic)    | 0 errors, 0 warnings                                                                                                                                                   |
| `npm run format:check`                            | clean                                                                                                                                                                  |
| `tsc -b` and `npm run build`                      | clean; JS 137 kB gzipped (budget 200 kB), CSS 6.4 kB gzipped                                                                                                           |
| `any`, `!`, `@ts-ignore`, `eslint-disable`        | none; the only `eslint-disable-next-line` lines are 4 in test mocks (`addListener`/`removeListener`, required by the `MediaQueryList` type), each with rule and reason |
| Type assertions (`as`, not `as const`)            | none left in non-test code (4 removed: `shuffle.ts`, `gameUnlock.ts`, `HomeScreen.tsx`, `bestScoresRepo.ts`)                                                           |
| TSDoc on exports in `core/`, `storage/`, `hooks/` | complete (27 symbols documented in this pass; a scan finds none missing)                                                                                               |
| `console.log`, TODO, FIXME                        | none                                                                                                                                                                   |
| BOM, CRLF                                         | none in tracked text files                                                                                                                                             |
| Swedish text outside `i18n/sv.ts` and `data/`     | none in code or comments; Swedish words with å/ä/ö appear only as test data, as the spec allows                                                                        |
| Tests                                             | 102 files, all pass; coverage 97.7% lines, 93% branches (thresholds in `vite.config.ts` met)                                                                           |

## Fixed in this pass

- `downloadTextFile` (`src/storage/fileIo.ts`): `try/finally`, delayed `revokeObjectURL`, error documented. Callers
  report a failed download with a translated message (`data.export.failed`).
- `shareLink.ts`: `pipe` renamed `transformBytes`, magic numbers replaced by `NO_SIZE_LIMIT`,
  `SHARE_MAX_INFLATED_BYTES` and `BASE64URL_TEXT`, contracts and the stream-writer catches documented.
- `session.ts`: doc comment that was glued to a closing brace, and the meaning of box 0 explained.
- CSV import and export, JSON import and share links: named limits in `core/importLimits.ts`.
- `speak()` error handling (earlier pass).

## Tracked (not changed in the gate)

### 1. `readImportFile` does too many things

- `src/hooks/useDataExchange.ts`: size check, read, format sniffing, JSON or CSV parse, bundle building and conflict
  detection in one callback. The size check is intentionally duplicated in `readFileText` as a safety net.
- Action: extract a pure `parseImportText(text, fileName, now, newId)` into `core/` and let `readFileText` throw a typed error.

### 2. `useLibraryStore` is a large hook with repeated logic

- `src/hooks/useLibraryStore.ts`: loading, persistence and all CRUD together; the read, compute, `commit`, `persist`
  pattern repeats; `recordAnswer` mixes spaced repetition, activity days and upserts; `persist` is fire-and-forget.
  `buildPair` joins terms with `";"` and re-parses them, which breaks for a term that contains `;`.
- Action: extract pure reducers and an `upsertById` helper into `core/`; let `buildPair` take already parsed terms.
  The `;` case needs a failing regression test first.

### 3. Hard-to-read validation code

- `src/core/exportFormat.ts`: `readSet/readPair/readProgress/readActivity` mix reading, validation and construction;
  the `lastSeenAt` rule and the `valid` flag are undocumented; `readNumber` and `readList` have inconsistent signatures.
- `src/hooks/useTrainingSession.ts`: `answer` and `answerRound` duplicate the finish-or-continue logic; `begin` and
  `start` are vague names.
- Action: add a short comment per rule, rename, extract an `advance(...)` helper.

### 4. Duplicated and unnamed constants

- `MAX_PROBLEMS = 50` is defined in both `core/csv.ts` and `core/exportFormat.ts`; move it to `core/importLimits.ts`.
- The 30-minute session gap (NH-15) and the 60-second round (NH-16) are named constants in `core/`; the auto-advance
  times in the cards use `AUTO_ADVANCE_MS`-style constants but are declared per component. Collect them in one
  `core/timing.ts` if they need tuning.
- `data.problem.tooLarge` repeats "10 MB" in the dictionaries (a comment links it to `MAX_IMPORT_FILE_BYTES`).

### 5. Other

- `src/hooks/useDatabaseStore.ts`: one effect opens, seeds and wires the event handlers; `onBlocking` could use a comment.
- Large files: see `codereview_architecture.md`, item 9.

## Error-handling audit (external calls)

| Call                         | Handling                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| IndexedDB open and writes    | caught in the hooks, shown through the storage banner (`storage.error.*`)              |
| File read, size, parse       | typed problems with translated messages, nothing imported on error                     |
| File download                | caught, translated toast (new)                                                         |
| Clipboard                    | caught, translated toast (`share.copyFailed`)                                          |
| Share link encode and decode | caught, translated `share.failed` and `share.import.invalid`                           |
| Speech, audio, vibration     | wrapped, deliberately silent because they are optional niceties (comments explain why) |
| Service worker registration  | returns `"failed"`; the app works online without it                                    |
| localStorage mirror          | returns `null` or `false`; IndexedDB stays the source of truth                         |
| Every training mode          | error boundary, covered by `tests/*Errors.test.tsx`                                    |

## Unclear messages and edge cases checked

- Import problems name the path (for example `pairs[3].a`) and a plain-language reason in both languages.
- Empty set, 1 to 3 words, duplicates, whitespace, å/ä/ö and emoji have tests (FR-TEST-4); new limit tests cover
  an empty file, a header-only CSV, over-limit lists and `__proto__`.
- Not covered by an automated test: a 500+ word set under real UI load (see the manual list in `docs/DELIVERY.md`).
