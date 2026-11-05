# Architecture review against CLAUDE.md

NH-19 final quality gate. Method: targeted scans (imports per layer, browser APIs and `Date.now`/`Math.random` in
`core/`, colours in `.ts`/`.tsx`, `any`, `eslint-disable`, type assertions, swallowed catches, module-level mutable
state, hard-coded base path, one component per file), repeated after the fixes below.

## Violations

| #   | Principle                                                     | Where                                                                                                                                                                                | Status                                                                                                                                                                                    |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Components never call storage directly                        | `ShareImportScreen.tsx` called `decodeSharePayload`                                                                                                                                  | **Fixed** earlier: logic lives in `hooks/useSharedSet.ts`.                                                                                                                                |
| 2   | Components never call storage directly                        | `SpeakButton.tsx`, `SpeechLanguageFields.tsx`, `SpeechSettings.tsx` (`storage/speech`), `FeedbackSettings.tsx` (`storage/feedback`), `SharePanel.tsx` (`storage/shareLink`)          | **Fixed.** New hooks `useSpeech`, `useFeedbackSupport` and `useShareLink`; a scan finds no `storage/` import in any component.                                                            |
| 3   | Browser I/O belongs in `storage/`                             | `SharePanel.tsx` used `navigator.clipboard`                                                                                                                                          | **Fixed.** `storage/clipboard.ts` (`copyText`, with tests); the panel reaches it through `useShareLink`.                                                                                  |
| 4   | Time is injected                                              | `Date.now()` in `HomeScreen`, `StatsScreen`, `SetsScreen`                                                                                                                            | **Not a violation.** The components pass `now` into `core/`, which stays deterministic.                                                                                                   |
| 5   | No hard-coded colours in components                           | `components/common/Mascot.tsx` (fixed illustration colours)                                                                                                                          | **Resolved by NH-12:** the mascots are PNG assets now. A scan finds no hex colour in any `.tsx` file.                                                                                     |
| 6   | No global mutable state                                       | `src/storage/feedback.ts:10`, module-level `let sharedContext: AudioContext \| null`                                                                                                 | **Tracked.** A lazily created singleton, because browsers limit the number of audio contexts. Moving it into a provider is a refactor with no user benefit; revisit if sound is extended. |
| 7   | Do not hard-code the Pages base path outside `vite.config.ts` | Not violated: only the DB name and localStorage keys contain the app name.                                                                                                           | OK                                                                                                                                                                                        |
| 8   | Dependencies point inward                                     | `src/hooks/*.test.tsx` import `components/common/*Provider`                                                                                                                          | **Accepted.** Test files only.                                                                                                                                                            |
| 9   | Functions do one thing / reasonable size                      | `hooks/useLibraryStore.ts` (about 500 lines), `core/exportFormat.ts` (about 640 lines), `components/train/TrainSession.tsx` (about 370 lines), `ListeningCard.tsx` (about 320 lines) | **Tracked.** See `codereview_code_quality.md`, problems 3 to 5. Splitting is a pure refactor and is better done as separate PRs, each with the existing tests as a safety net.            |

## In line with the principles (verified)

- `src/core/` imports nothing from `storage`, `hooks`, `components`, `i18n`, `react` or `idb`, and uses no `document`,
  `window`, `navigator`, `localStorage`, `Date.now` or `Math.random` (the two hits are comments).
- `src/storage/` does not import from `hooks/` or `components/`; `src/hooks/` does not import components outside tests.
- `src/core/contentSecurityPolicy.ts` is pure and shared with `vite.config.ts`, so the policy text is unit-tested.
- No `any`, no `!`, no `eslint-disable`, no `@ts-ignore`; all type assertions are gone from non-test code (the last
  four were in `shuffle.ts`, `gameUnlock.ts`, `HomeScreen.tsx` and `bestScoresRepo.ts`).
- One exported component per `.tsx` file; file names match their main export.
- The only module-level `let` in non-test code is the one in item 6.
- Errors are not swallowed: every remaining empty or fallback `catch` carries a comment that says why (optional
  feature such as audio, vibration, speech, localStorage mirror, service worker registration, malformed URL).

## Tracked for later

1. Split `useLibraryStore`, `exportFormat.ts` and `TrainSession.tsx` (item 9).
2. Optional: a `useNow()` hook, and an injectable audio context (item 6).
