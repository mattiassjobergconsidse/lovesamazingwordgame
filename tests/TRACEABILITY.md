# Requirement traceability

Maps each requirement ID to the tests that verify it (FR-TEST-2). Update this table in every PR that touches requirements.
Tests carry the ID in their title; search the repo for the ID to find them.

| Requirement | Status     | Tests                                                                                                                                                              |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-I18N-1   | P0 done    | `src/core/settings.test.ts`, `src/hooks/useSettingsStore.test.ts`, `tests/app.test.tsx`                                                                            |
| FR-I18N-2   | P0 done    | `src/i18n/dictionaries.test.ts`, `src/i18n/format.test.ts`                                                                                                         |
| FR-SETT-1   | P0 partial | `src/storage/settingsRepo.test.ts`, `src/hooks/useSettingsStore.test.ts` (persistence only; Settings screen comes later)                                           |
| FR-THEME-1  | P0 partial | `src/core/settings.test.ts`, `src/hooks/useResolvedTheme.test.ts`, `src/storage/preferenceMirror.test.ts`, `tests/app.test.tsx` (selector in Settings comes later) |
| FR-THEME-2  | P0 manual  | Tokens in `src/index.css`; visual check in both themes at review time                                                                                              |
| FR-LANG-3   | P0 done    | `tests/app.test.tsx`                                                                                                                                               |
| FR-BP-2     | P0 done    | `src/components/common/ErrorBoundary.test.tsx`                                                                                                                     |
| FR-BP-4     | P0 done    | `src/storage/db.test.ts`, `src/hooks/useSettingsStore.test.ts`, `tests/app.test.tsx`                                                                               |
| FR-BP-11    | P0 done    | `tests/app.test.tsx` (axe on the shell)                                                                                                                            |
| FR-SET-1    | P1 done    | `src/core/setValidation.test.ts`, `src/storage/exampleSeed.test.ts`, `tests/sets.test.tsx`                                                                         |
| FR-SET-2    | P1 done    | `tests/sets.test.tsx`                                                                                                                                              |
| FR-SET-3    | P1 done    | `src/storage/libraryRepos.test.ts`, `src/hooks/useLibraryStore.test.tsx`, `tests/sets.test.tsx`                                                                    |
| FR-SET-4    | P1 done    | `src/core/setValidation.test.ts`, `src/storage/libraryRepos.test.ts`, `tests/sets.test.tsx`                                                                        |
| FR-SET-5    | P1 done    | `src/core/setSummary.test.ts`, `tests/sets.test.tsx`                                                                                                               |
| FR-SET-6    | P1 done    | `src/core/pairText.test.ts`, `src/hooks/useLibraryStore.test.tsx`, `src/components/common/ToastProvider.test.tsx`, `tests/editor.test.tsx`                         |
| FR-SET-7    | P1 done    | `src/core/pairText.test.ts`, `tests/editor.test.tsx`                                                                                                               |
| FR-SET-8    | P1 done    | `src/core/bulkParse.test.ts`, `tests/editor.test.tsx`                                                                                                              |
| FR-SET-9    | P1 done    | `src/core/filterPairs.test.ts`, `tests/editor.test.tsx`                                                                                                            |
| FR-ACT-1    | P1 done    | `src/core/trainingEligibility.test.ts`, `tests/editor.test.tsx`                                                                                                    |
| FR-ACT-2    | P1 done    | `tests/sets.test.tsx`, `tests/editor.test.tsx`                                                                                                                     |
| FR-TRN-2    | P2 core    | `src/core/session.test.ts`, `src/core/shuffle.test.ts` `tests/training.test.tsx`                                                                                   |
| FR-TRN-3    | P2 core    | `src/core/direction.test.ts`                                                                                                                                       |
| FR-TRN-4    | P2 core    | `src/core/spacedRepetition.test.ts`, `src/core/session.test.ts` `src/storage/progressRepo.test.ts`, `tests/training.test.tsx`                                      |
| FR-TRN-5    | P2 core    | `src/core/session.test.ts` `tests/training.test.tsx`                                                                                                               |
| FR-TRN-7    | P2 core    | `src/core/session.test.ts`                                                                                                                                         |
| FR-TRN-8    | P2 core    | `src/core/session.test.ts`                                                                                                                                         |
| FR-TRN-9    | P2 core    | `src/core/session.test.ts`                                                                                                                                         |
| FR-WR-1     | P4 done    | `tests/writing.test.tsx`                                                                                                                                           |
| FR-WR-2     | P4 done    | `src/core/checkAnswer.test.ts`, `tests/writing.test.tsx`                                                                                                           |
| FR-WR-3     | P4 done    | `src/core/checkAnswer.test.ts`, `tests/writing.test.tsx`                                                                                                           |
| FR-WR-4     | P4 done    | `src/core/checkAnswer.test.ts`, `src/core/writingResult.test.ts`, `tests/writing.test.tsx`                                                                         |
| FR-QZ-1     | P2 core    | `src/core/quiz.test.ts`                                                                                                                                            |
| FR-QZ-3     | P2 core    | `src/core/quiz.test.ts`                                                                                                                                            |
| FR-MT-1     | P2 core    | `src/core/matching.test.ts`                                                                                                                                        |
| FR-MT-2     | P2 core    | `src/core/matching.test.ts` (match evaluation only)                                                                                                                |
| FR-MT-3     | P2 core    | `src/core/matching.test.ts`                                                                                                                                        |
| FR-MT-4     | P2 core    | `src/core/matching.test.ts`                                                                                                                                        |
| FR-FC-1     | P4 done    | `src/core/flashcardInput.test.ts`, `tests/training.test.tsx`                                                                                                       |
| FR-FC-2     | P4 done    | `src/core/flashcardInput.test.ts`, `tests/training.test.tsx`                                                                                                       |
| FR-FC-3     | P4 done    | `tests/training.test.tsx`                                                                                                                                          |

Requirements not listed here have not been implemented yet.
