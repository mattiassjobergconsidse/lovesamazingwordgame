# Code Quality Review
Scope: `src/` (excluding tests). Focus: functions doing more than one thing, unclear naming, missing error handling for external calls, code that is hard to read without comments.
## The five most serious problems
### 1. `speak()` lacks error handling (external call) - FIXED
- File: `src/storage/speech.ts:57-69`
- `speechSynthesis.cancel()/speak()` were called without `try`/`catch`. The function is called from `useEffect` (autoplay) and click handlers, so a throw could crash rendering. Inconsistent with `feedback.ts`, which guards its audio calls.
- Fix applied: the calls are now wrapped in `try`/`catch` with an explanatory comment.
### 2. `downloadTextFile` lacks error handling and cleanup
- File: `src/storage/fileIo.ts:11-24` (callers in `src/hooks/useDataExchange.ts:82-136`)
- No `try`/`finally`: if `Blob`/`click` throws, the object URL leaks and the error reaches the user without feedback. `revokeObjectURL` runs right after `click()`, which can cancel the download in some browsers.
- Suggestion: use `try`/`finally`, delay the revoke (`setTimeout`), catch errors in callers and show a message.
### 3. `readImportFile` does too many things
- File: `src/hooks/useDataExchange.ts:138-177`
- Size check, file reading, format sniffing, JSON/CSV parsing, bundle building (ids, timestamps) and conflict detection in one callback. The size check is duplicated in `readFileText`.
- Suggestion: extract a pure `parseImportText(...)` into `core/`; have `readFileText` throw a typed error.
### 4. `useLibraryStore` is a large hook with repeated logic
- File: `src/hooks/useLibraryStore.ts:79-474`
- Loading, persistence and all CRUD in one place. The read-compute-`commit`-`persist` pattern is repeated. `recordAnswer` (397-434) mixes spaced-repetition logic, activity days and upserts; the variable `exists` is unclear. `persist` is fire-and-forget with no rollback, and `reload` lacks `try`/`catch`. `buildPair`/`addParsedPairs` (47-68, 285-309) join terms with `";"` and re-parse them, which breaks if a term contains `;`.
- Suggestion: extract pure reducers and an `upsertById` helper into `core/`; let `buildPair` accept already parsed terms.
### 5. Hard-to-read code and unclear names in sharing/validation
- `src/storage/shareLink.ts:25-106`: `pipe` is a vague name, magic numbers (`Number.MAX_SAFE_INTEGER`, `SHARE_MAX_CHARS * 4`), undocumented `atob` padding/error contract.
- `src/core/exportFormat.ts:237-411`: `readSet/readPair/readProgress/readActivity` mix reading, validation and construction; the `lastSeenAt` rule (339-345) and the `valid` flag are undocumented; `readNumber`/`readList` have inconsistent signatures.
- `src/hooks/useTrainingSession.ts:149-210`: `answer` and `answerRound` duplicate the finish-or-continue logic; `begin`/`start` are vague names.
- Suggestion: rename (`pipe` -> `transformBytes`), use named constants, add comments, extract an `advance(...)` helper.
## Other (lower priority)
- `src/core/session.ts:168`: doc comment glued to a closing brace; `box === 0` meaning "new word" is unexplained.
- `src/hooks/useDatabaseStore.ts:20-67`: one effect mixes opening, seeding and event handlers; `onBlocking` is uncommented.
## Status
- Fixed: problem 1.
- Remaining: problems 2-5.
