# Architecture review against CLAUDE.md

Method: targeted searches (imports per layer, browser APIs and `Date.now`/`Math.random` in `core/`, colours in
`.ts`/`.tsx`/`.css`, `any`, `eslint-disable`, swallowed catches, module-level mutable state, hard-coded base path).
This is not a full line-by-line review. Not checked: "functions do one thing", one component per file, TSDoc
coverage, hard-coded UI strings.

## Violations

| #   | Principle                                                     | Where                                                                                                                                                                                                                                   | Status                                                                                                                                                                       |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Components never call storage directly                        | `src/components/data/ShareImportScreen.tsx` called `decodeSharePayload` (storage)                                                                                                                                                       | **Fixed**: logic moved to `src/hooks/useSharedSet.ts`                                                                                                                        |
| 2   | Components never call storage directly                        | `src/components/settings/FeedbackSettings.tsx:3` (`storage/feedback`), `settings/SpeechSettings.tsx:3`, `sets/SpeechLanguageFields.tsx:4`, `common/SpeakButton.tsx:4` (`storage/speech`), `sets/SharePanel.tsx:8` (`storage/shareLink`) | Open                                                                                                                                                                         |
| 3   | Browser I/O belongs in `storage/`                             | `src/components/sets/SharePanel.tsx:39` uses `navigator.clipboard`                                                                                                                                                                      | Open                                                                                                                                                                         |
| 4   | Time is injected                                              | `Date.now()` in components: `home/HomeScreen.tsx:24`, `stats/StatsScreen.tsx:20`, `sets/SetsScreen.tsx:22` (the same call was in `ShareImportScreen`, now in the hook)                                                                  | **Not a violation.** CLAUDE.md injects time to keep `core/` deterministic, and these components pass `now` into `core/`. A `useNow()` hook would only be a style improvement |
| 5   | No hard-coded colours in components                           | `src/components/common/Mascot.tsx:18-55` (about 16 hex values in SVG)                                                                                                                                                                   | Debatable. These are fixed illustration colours, not themed UI colours. All CSS colours are theme variables in `src/index.css`                                               |
| 6   | No global mutable state                                       | `src/storage/feedback.ts:10` module-level `sharedContext: AudioContext \| null`                                                                                                                                                         | Open (a lazily created singleton, limited impact, but not injected)                                                                                                          |
| 7   | Do not hard-code the Pages base path outside `vite.config.ts` | Not violated. The `lovesamazingwordgame` hits are only the DB name and localStorage keys (`storage/db.ts:10`, `storage/preferenceMirror.ts:5-6`), plus a backup filename in `hooks/useDataExchange.ts:110`                              | OK                                                                                                                                                                           |
| 8   | Dependencies point inward                                     | `src/hooks/*.test.tsx` import `components/common/*Provider` (test files only)                                                                                                                                                           | Minor. Providers could live in `hooks/` or the tests could use `tests/` helpers                                                                                              |

## In line with the principles

- `src/core/` is clean: no imports from `storage`, `hooks`, `components`, `react` or `idb`, no `document`, `window`,
  `navigator`, `Date.now` or `Math.random`. `core/shuffle.ts` takes an injected `rng`, and `core/settings.ts` takes
  `browserLanguages` as an argument.
- `src/storage/` does not import from `hooks/` or `components/`.
- `src/hooks/` does not import components in non-test code.
- No `any`, no `eslint-disable` anywhere in `src/`.
- Errors are not swallowed. The remaining `.catch(() => undefined)` calls are deliberate:
  - `storage/transaction.ts:28,36` only prevents unhandled rejections while the original error is rethrown. The
    comments explain why.
  - `storage/shareLink.ts:40-41`: write and close errors on a transform stream also surface through
    `reader.read()`, which is awaited. A short "why" comment would help.
- Colours in CSS come only from the theme variables in `src/index.css`.
- The only module-level `let` in non-test code is `storage/feedback.ts:10` (see #6).
- Layering is reflected in the folder structure from CLAUDE.md, with tests next to `core/` files.

## Fix applied

#1: new hook `src/hooks/useSharedSet.ts` wraps decoding (storage) and parsing (core). `ShareImportScreen.tsx` now
only uses the hook. The hook handles decode failures with an explicit `try/catch` that maps to the translated "invalid"
state, so it no longer has a trailing `.catch(() => undefined)`.
Tests: `src/hooks/useSharedSet.test.ts` (valid link, undecodable link, decodable but invalid content, empty payload).
`tests/share.test.tsx` still passes, and `tests/TRACEABILITY.md` (NH-5) is updated.

## Suggested next steps

1. Fix #2 and #3 using hooks such as `useSpeech`, `useFeedbackSupport` and `useClipboard`.
2. Add a "why" comment to the stream-writer catches in `storage/shareLink.ts`.
3. Optional: `useNow()` hook (#4) and themed mascot colours (#5).
4. Extend the review to the unchecked principles listed under Method.
