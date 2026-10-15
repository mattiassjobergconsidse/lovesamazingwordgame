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
| FR-ACT-2    | P0 partial | `tests/app.test.tsx` (active set bar placeholder; persistence of `activeSetId` is stored in settings)                                                              |

Requirements not listed here have not been implemented yet.
