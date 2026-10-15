# SPEC.md: Love's Amazing Word Game

Implementation spec for AI agents. Read `CLAUDE.md` first (rules, architecture, conventions).
This file defines WHAT to build. `CLAUDE.md` defines HOW to behave. If they conflict, `CLAUDE.md` wins
for rules and architecture; ask the user before deviating.

**How to use this file**

1. Plan: read the whole file, then propose a plan following "Delivery plan" (section 12). Wait for approval.
2. Implement one phase per feature branch/PR. Tick the checklist items you finish.
3. Every requirement has an ID (e.g. `FR-SET-2`). Reference IDs in commit messages and tests.
4. A requirement is done only when its acceptance criteria (AC) pass and tests exist.
5. Unsure? Ask. Follow the decisions and do not guess on anything in "Open questions" (section 13).

---

## 1. Background and goal

A static web app for learning vocabulary ("glosor") from word pairs. Typical use: a school pupil or adult
learner gets a new list of word pairs each week and wants to practise it in a smooth, friendly way.
It must be **language independent**: a set is just pairs of "term A" and "term B" with two user-defined language
labels (e.g. Svenska/English, but also Español/Svenska or anything else).

Hosting: GitHub Pages, https://mattiassjobergconsidse.github.io/lovesamazingwordgame/
Repo: https://github.com/mattiassjobergconsidse/lovesamazingwordgame
No backend, no accounts. All data lives in the browser (IndexedDB) and can be exported/imported.

Quality bar (important): the app should feel "smooth as silk". See section 9 (UX requirements). It must be
usable on phones (touch first) and desktop (keyboard first), and good enough to list on a CV.

## 2. Tech stack (already scaffolded)

| Area        | Choice                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Language    | TypeScript, strict mode                                                              |
| UI          | React 19 + Vite (static build, `base: '/lovesamazingwordgame/'` in `vite.config.ts`) |
| Persistence | IndexedDB through `idb`                                                              |
| Tests       | Vitest + React Testing Library + jest-dom (+ user-event)                             |
| Format/lint | Prettier, ESLint (`npm run lint`, `npm run format`)                                  |
| CI/CD       | `.github/workflows/deploy.yml` (lint, test, build; deploy on push to `main`)         |

Rules that follow from the stack (see `CLAUDE.md` for the full list):

- No new dependencies without asking. This explicitly includes: router, state library, i18n library,
  UI kit, animation library, CSV parser. Build these small things by hand or ask first.
- Routing: use a tiny hand-written hash router (`#/sets`, `#/train/flashcards`, ...). Hash routing is needed
  because GitHub Pages has no SPA fallback. Ask before adding a router library.
- Styling: plain CSS (CSS modules or one stylesheet per component), CSS variables for theme. No CSS framework.
- i18n: hand-written typed dictionaries (`sv`, `en`), see FR-I18N.

## 3. Domain model

All types live in `src/types.ts`. IDs are strings from `crypto.randomUUID()`. Timestamps are epoch ms numbers.

```ts
type Direction = "AtoB" | "BtoA";

interface WordSet {
  id: string;
  name: string; // mandatory, trimmed, 1..60 chars, editable, unique (case-insensitive)
  langA: string; // label, e.g. "Svenska", 1..30 chars, editable
  langB: string; // label, e.g. "English", 1..30 chars, editable
  langACode?: string; // optional BCP-47 tag for speech (NH-2), e.g. "sv-SE"; defined now to avoid a later migration
  langBCode?: string; // optional BCP-47 tag for speech (NH-2), e.g. "en-GB"
  createdAt: number;
  updatedAt: number;
}

interface WordPair {
  id: string;
  setId: string;
  a: string; // term in language A, trimmed, non-empty
  b: string; // term in language B, trimmed, non-empty
  // Optional alternatives accepted as correct answers, e.g. "big;large" -> ["large"]
  altA?: string[];
  altB?: string[];
  createdAt: number;
  updatedAt: number;
}

// Spaced repetition state, one per word pair (direction is random per presentation, not tracked)
interface WordProgress {
  pairId: string;
  setId: string;
  box: 0 | 1 | 2 | 3 | 4 | 5; // 0 = new/unseen, 1..5 = Leitner boxes
  dueAt: number; // epoch ms, next time the word is due
  correct: number; // lifetime counters
  wrong: number;
  lastSeenAt: number | null;
  streak: number; // consecutive correct answers
}

interface Settings {
  uiLanguage: "sv" | "en";
  theme: "light" | "dark" | "system";
  activeSetId: string | null;
  directionMode: "random" | "AtoB" | "BtoA"; // default 'random'
  sessionSize: 10 | 20 | 50 | "all"; // default 20
  ignoreAccents: boolean; // default false; when true, accent-only differences count as correct (FR-WR-2)
  speechEnabled: boolean; // nice-to-have
}

// One record per set and local calendar day, used for streaks and the 14-day chart (FR-ST-1, FR-ST-3)
interface DailyActivity {
  id: string; // `${setId}:${date}`
  setId: string;
  date: string; // local date "YYYY-MM-DD"
  answered: number;
  correct: number;
}
```

Answer results used everywhere (`core/`): `type AnswerResult = "correct" | "wrong" | "assisted"`.
`assisted` = hint used or "almost" (accent difference) in Writing mode.

IndexedDB stores (db name `lovesamazingwordgame`, schema version 1):
`sets` (key `id`), `pairs` (key `id`, index `setId`), `progress` (key `pairId`, index `setId`),
`activity` (key `id`, index `setId`), `settings` (single record, key `"settings"`).
Changing this format later needs a migration (`upgrade` callback in `idb`) and user approval.

`Settings.theme` and `Settings.uiLanguage` are also mirrored to `localStorage` (by `storage/`) so `index.html` can apply
theme and `lang` before first paint (FR-THEME-1). IndexedDB is the source of truth.

Deleting a set deletes its pairs, progress and activity (in one transaction).

## 4. Architecture (applies `CLAUDE.md` principles)

```
src/
├── main.tsx
├── App.tsx                  # shell: header, nav, router outlet, active-set bar
├── types.ts
├── data/                    # bundled example set (example-sv-en.json), imported as a module
├── i18n/                    # sv.ts, en.ts, index.ts (typed keys, t() hook), no library
├── core/                    # PURE. No browser APIs, no I/O, no Date.now()/Math.random() (inject them)
│   ├── spacedRepetition.ts  # applyResult, intervals, isDue, countDue
│   ├── session.ts           # buildSessionQueue, re-queue of wrong answers, session state transitions
│   ├── direction.ts         # pick direction per card (random or forced)
│   ├── checkAnswer.ts       # normalisation + comparison for Writing mode
│   ├── quiz.ts              # distractor selection, option shuffling
│   ├── matching.ts          # round building, pair validation
│   ├── shuffle.ts           # Fisher-Yates with injected rng
│   ├── stats.ts             # statistics and streak calculation
│   └── importParse.ts       # parse CSV/JSON/pasted text into pairs (returns result + errors)
├── storage/                 # ALL I/O: db.ts, setsRepo.ts, pairsRepo.ts, progressRepo.ts,
│                            # settingsRepo.ts, exportImport.ts, speech.ts (nice-to-have)
├── hooks/                   # useSets, usePairs, useActiveSet, useSettings, useTrainingSession, ...
├── components/              # UI only; common/ (Button, Dialog, Toast, ...) and one folder per screen
└── router.ts                # hash router
tests/                       # test setup + integration tests; unit tests sit next to files as *.test.ts
```

Dependency direction: `components -> hooks -> storage | core`. `core` imports nothing from other layers.
Randomness and time are injected: `shuffle(items, rng)`, `applyResult(progress, result, now)`.
Components never call IndexedDB directly. Errors from storage surface as a user-visible toast (translated).

## 5. Screens and navigation

Hash routes:

| Route                                                                       | Screen                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `#/`                                                                        | Home: active set summary, big "Train" buttons for the four modes, due-word count, stats snapshot |
| `#/sets`                                                                    | Set list: create, open, duplicate, delete, choose active                                         |
| `#/sets/:id`                                                                | Set editor: name, language labels, word pairs table (add/edit/remove), import/export             |
| `#/train`                                                                   | Mode picker (Flashcards, Quiz, Matching, Writing) for the active set                             |
| `#/train/flashcards`, `#/train/quiz`, `#/train/matching`, `#/train/writing` | Training modes                                                                                   |
| `#/stats`                                                                   | Statistics for the active set                                                                    |
| `#/settings`                                                                | UI language, theme, direction, session size, export/import all, reset                            |

Global, always visible: a compact **active set bar** (set name, word count, "Change" button).

## 6. Functional requirements

### 6.1 Sets (`FR-SET`)

- `FR-SET-1` Create a set with a mandatory name and mandatory language labels A and B (empty fields with translated placeholders,
  e.g. "Language A"/"Språk A"; the last used labels are pre-filled for convenience).
  AC: Save is disabled while name or a label is empty/whitespace; inline error shown; duplicate name rejected (case-insensitive).
- `FR-SET-2` Rename a set and edit language labels at any time. AC: changes persist and update everywhere immediately.
- `FR-SET-3` Delete a set with confirmation dialog stating the set name and the number of words. Deletes pairs, progress and activity.
  AC: if it was active, active set becomes null and the user is prompted to choose one.
- `FR-SET-4` Duplicate a set ("Copy of ..."), progress is NOT copied.
- `FR-SET-5` Multiple sets can exist; the list shows name, language labels, word count, last practised, due count.
- `FR-SET-6` Add/edit/remove word pairs in a set. Inline editing in a table/list; adding is keyboard-friendly
  (Enter in the last field saves and moves to the next empty row; Tab moves between A and B). Changes autosave.
  Empty rows are not saved. Leading/trailing whitespace trimmed. A duplicate pair (same `a` and `b`, case-insensitive) is saved
  but marked with a warning and a one-click "Remove duplicate" action.
  AC: removing a pair offers Undo via toast (5 s) before it is final. Editing a pair's text keeps its progress.
- `FR-SET-7` Optional alternative answers per pair, entered separated by `;` (e.g. `big; large`). First value is the main term. Used for answer checking (6.5) and shown on flashcard back.
- `FR-SET-8` Bulk add: paste multiple lines (`term<TAB>translation`, `term;translation` or `term - translation`) into a textarea; preview before import; invalid lines are listed.
- `FR-SET-9` Search/filter pairs inside a set (client-side). Needed once a set has > 20 words.

### 6.2 Active set (`FR-ACT`)

- `FR-ACT-1` At most one set is "active" at a time. Before any training feature starts, an active set must be selected.
  AC: opening `#/train/*` with no active set opens a set-picker dialog; after choosing, training continues.
  AC: minimum words per mode: Flashcards and Writing >= 1, Quiz >= 2 (FR-QZ-3), Matching >= 2 (FR-MT-4). Below the minimum the mode
  button is disabled with a clear message and a link to the set editor.
- `FR-ACT-2` Active set persists across reloads (`Settings.activeSetId`). Changing it is possible from the active set bar everywhere.

### 6.3 Training session rules (`FR-TRN`), shared by ALL four modes

- `FR-TRN-1` Words come from the **whole active set** (no manual subset selection).
- `FR-TRN-2` **Order is decided by spaced repetition, not random** (see 7). A session = up to `sessionSize` words
  chosen as: due words (oldest due first), then new words (box 0) in a stable-random order, then, if still short, the
  words with the lowest box ("practise anyway"). Ties are broken randomly.
- `FR-TRN-3` **Direction is random per card** (A->B or B->A) unless `Settings.directionMode` forces one. The same session UI
  must label which language is the prompt and which is the answer on every card.
- `FR-TRN-4` The **first** answer to each word in a session updates `WordProgress` through `applyResult` (see 7) and `DailyActivity`,
  and is persisted right away (closing the tab loses nothing). Re-queued repetitions (FR-TRN-7) do not change progress again.
- `FR-TRN-5` Session end screen: score, time, words to review again, "Practise mistakes" (a new session with only the wrong ones), "Back to home".
- `FR-TRN-6` Users can leave a session at any time (Esc or a Quit button) without data loss. Never show a confirm dialog: progress is already saved after each answer.
- `FR-TRN-7` Wrong answers during a session are re-queued once at the end of the same session (so the user sees them again).
- `FR-TRN-8` A progress bar ("7 / 20") is always visible.
- `FR-TRN-9` If the set has no due and no new words, the session still starts with the lowest-box words (FR-TRN-2) and the start
  screen says "Nothing due, extra practice", so the user is never blocked.

### 6.4 Flashcards (`FR-FC`)

- `FR-FC-1` Card shows the prompt side; tap/click/Space flips it (CSS 3D flip, respects `prefers-reduced-motion`).
- `FR-FC-2` After flipping, the user self-grades with two big buttons: "I knew it" (->, key `Right` or `2`) and "Not yet" (<-, key `Left` or `1`).
  Swipe right/left on touch does the same.
- `FR-FC-3` Back side shows the answer and alternatives. Language label shown small on each side.
- AC: complete a 10-card session using only the keyboard.

### 6.5 Writing (`FR-WR`)

- `FR-WR-1` Show the prompt in one language; the user types the translation in a text field (auto-focused, Enter submits, no autocorrect/autocapitalize/spellcheck).
- `FR-WR-2` Answer checking (`core/checkAnswer.ts`): compare after normalising (trim, collapse whitespace, case-insensitive,
  Unicode NFC, strip surrounding punctuation). Accent differences are **not correct by default** (e.g. `a` vs `ä`, matters for Swedish)
  but shown as "almost, check accents" with partial feedback; result `assisted` (not correct). If `Settings.ignoreAccents` is on (off by default), accent-only differences count as `correct`. Accept any of `b` / `altB` (or `a` / `altA`).
- `FR-WR-3` Feedback: correct = green + icon + brief success animation, auto-advance after ~0.8 s (or Enter). Wrong = show the correct answer
  with a diff highlight of what differed, user presses Enter/Next to continue. Offer "I was right" override button (result `correct`) for synonyms not in the list.
- `FR-WR-4` Optional hint button: reveals the next letter; using a hint gives result `assisted` (box unchanged).
- `FR-WR-5` Special-character buttons are out of scope for v1 (the OS keyboard is enough).

### 6.6 Quiz (multiple choice) (`FR-QZ`)

- `FR-QZ-1` Show the prompt and 4 answer options (1 correct + 3 distractors from other words of the active set, same direction).
  Options are shuffled. Distractors must be unique and must not equal the correct answer or its alternatives.
- `FR-QZ-2` Choose by click/tap or keys `1`-`4`. Immediate feedback (correct option green, chosen wrong option red), then auto-advance
  after ~1 s or on any key/tap.
- `FR-QZ-3` 4 options when the set has >= 4 pairs; with 2-3 pairs use as many options as there are pairs. Below 2 pairs the mode is disabled (FR-ACT-1).

### 6.7 Matching (`FR-MT`)

Design decision (made by the product owner's request for a recommendation): **two columns, tap-to-pair**.

- `FR-MT-1` A round shows up to 6 pairs (left column = language A terms, right column = language B terms, both columns shuffled independently).
  Direction is "random per card" here by random column order: for each round the column order may be swapped (A left / B left).
- `FR-MT-2` User taps one item in a column, then one in the other. Correct match: both fade out/lock in green. Wrong: both shake red and deselect; counts as a mistake for those words.
  Drag-to-connect is NOT required (taps only, keyboard: arrow keys + Enter, or type the number/letter shown on each item).
- `FR-MT-3` A session = several rounds until all session words are matched. Each word's first attempt in the round decides its SR result
  (first-try correct = correct, otherwise wrong).
- `FR-MT-4` Needs >= 2 pairs. Rounds use up to 6 pairs; if a single pair would be left for the last round, it is added to the
  previous round (max 7 in that round).

### 6.8 Statistics (`FR-ST`)

- `FR-ST-1` Per active set: words total, new (box 0), learning (box 1-4), mastered (box 5), due now, accuracy %, practice streak
  (consecutive local days with `DailyActivity`, computed in `core/stats.ts`).
- `FR-ST-2` List of the hardest words (highest wrong ratio, min 2 attempts) with a "Practise these" button (a session of only those words).
- `FR-ST-3` Last 14 days of `DailyActivity` as a simple bar chart (plain SVG/CSS, no chart library).

### 6.9 Import / export (`FR-IO`)

- `FR-IO-1` Export one set (or all data) as JSON file download. Includes `formatVersion`, sets, pairs, and optionally progress and activity (checkbox).
- `FR-IO-2` Import JSON (same format). On name conflict, ask: rename / replace / skip. Validate strictly, show a readable error list; never partially import on error (single transaction).
- `FR-IO-3` Import/export one set as CSV (`a,b` with header row containing the language labels; UTF-8 with BOM for Excel; accept `;` and tab as separators when importing).
- `FR-IO-4` "Reset all data" in settings requires typing the word `RESET` (translated) to confirm.

### 6.10 Settings and i18n (`FR-I18N`, `FR-SETT`)

- `FR-I18N-1` UI available in Swedish and English, switchable in settings (and the header) at runtime, persisted.
  First visit: use the browser language if it is `sv` or `en`, otherwise Swedish.
- `FR-I18N-2` Dictionaries in `src/i18n/sv.ts` and `en.ts` with typed keys (the compiler fails if a key is missing in one). No i18n library.
  Pluralisation and number formatting via `Intl` APIs. Set/pair content is never translated (it is user data).
- `FR-SETT-1` Settings: UI language, theme (light/dark/system), direction mode (random / A->B / B->A), session size, ignore accents (off by default), speech on/off.
- `FR-THEME-1` (must-have) The user can choose **Light**, **Dark** or **System** (follows `prefers-color-scheme`, default). The choice is
  persisted in `Settings.theme` and applied on startup before first paint (a small inline script in `index.html` sets `data-theme`
  on `<html>` from the `localStorage` mirror described in section 3, to avoid a flash of the wrong theme).
  AC: a theme toggle (sun/moon icon button, with accessible label) is available in the header on every screen and a full selector
  (Light / Dark / System) exists in Settings; switching is instant, no reload; in System mode the app reacts live to OS changes.
- `FR-THEME-2` All colours come from CSS variables defined per theme (`:root[data-theme='light']` / `'dark'`). No hard-coded colours in components.
  Both themes meet WCAG AA contrast, including feedback colours (correct/wrong) which must also use icons/text. Set `color-scheme` so native controls match.
  AC: every screen and every training mode is visually checked in both themes.

## 7. Spaced repetition design (`core/spacedRepetition.ts`)

Leitner system with 5 boxes. Pure functions, `now` is a parameter.

| Box | Meaning  | Interval until next due       |
| --- | -------- | ----------------------------- |
| 0   | new      | due immediately               |
| 1   | learning | 10 minutes (same-day re-test) |
| 2   |          | 1 day                         |
| 3   |          | 3 days                        |
| 4   |          | 7 days                        |
| 5   | mastered | 21 days                       |

- Correct answer: `box = min(box + 1, 5)`, `streak += 1`, `dueAt = now + interval(box)`.
- Wrong answer: `box = max(1, box - 2)` (new/box 0 goes to 1), `streak = 0`, `dueAt = now + interval(box)`.
- `assisted` (hint used or "almost"): `box` unchanged, `streak = 0`, `dueAt = now + interval(box)` (box 0 becomes 1).
- All intervals are constants in one place (`INTERVALS_MS`) so they are easy to tune.
- Required unit tests: promotion, demotion, floor/ceiling, due ordering, queue building (due first, then new, then lowest box),
  empty set, `sessionSize` larger than set, deterministic with a seeded rng.

Function sketch (adapt, but keep pure and typed):

```ts
// core/spacedRepetition.ts
export function applyResult(
  p: WordProgress,
  result: AnswerResult,
  now: number,
): WordProgress;
export function countDue(progress: Iterable<WordProgress>, now: number): number;

// core/session.ts
export function buildSessionQueue(
  pairs: WordPair[],
  progress: Map<string, WordProgress>,
  opts: { size: number | "all"; now: number; rng: () => number },
): WordPair[];
```

Words without a `WordProgress` record are treated as box 0 (new); the record is created on the first answer.

`core/direction.ts`: `pickDirection(mode: Settings['directionMode'], rng): Direction`.

## 8. Nice-to-have (only after all must-haves are done and merged)

Implement in this order. Each needs its own PR and must not break the "no backend / no tracking" rules.

1. **PWA / offline** (`NH-1`): web manifest, app icons, service worker that precaches the build so the app works offline and is installable.
   Ask before adding `vite-plugin-pwa`; a hand-written service worker is the default. AC: Lighthouse PWA installable; works in airplane mode after first load.
2. **Pronunciation** (`NH-2`): speaker button on cards using the Web Speech API (`speechSynthesis`). Voice language is taken from a BCP-47 tag
   stored on the set (`langACode`, `langBCode`, already in the schema; picked from a dropdown of available voices).
   Wrap in `storage/speech.ts`; hide the button if unsupported. Optional auto-play when a card shows.
3. **Theme polish** (`NH-3`): light/dark selection itself is a must-have (`FR-THEME-*`); this item is extra polish only (smooth colour transitions, additional accent colour choices).
4. **Sounds and haptics** (`NH-4`): short correct/wrong sounds (generated with WebAudio, no files) and `navigator.vibrate` on mobile; off by default, setting to enable.
5. **Share a set via link** (`NH-5`): encode a small set as compressed base64 in the URL hash so it can be sent to a friend; import dialog on open. No server.
6. **Keyboard shortcut help** (`NH-6`): `?` opens an overlay listing shortcuts.
7. **Print view** (`NH-7`): print-friendly list of a set (CSS `@media print`).

## 8b. Language and encoding conventions (`FR-LANG`)

- `FR-LANG-1` All code, comments, identifiers, test names, JSON keys, commit messages, PR texts and documentation are written in **English**.
  The only non-English text allowed is user-facing UI text in `src/i18n/sv.ts` and bundled example word data in `src/data/`.
- `FR-LANG-2` Every text file is **UTF-8 without BOM** with LF line endings (enforced by `.gitattributes`: `* text=auto eol=lf`).
  Exception: CSV export for Excel uses UTF-8 **with** BOM (FR-IO-3).
  `index.html` keeps `<meta charset="UTF-8" />`. Never escape non-ASCII characters (å, ä, ö) in source or data; write them directly.
- `FR-LANG-3` The `lang` attribute on `<html>` follows the selected UI language (`sv`/`en`).
- AC: a reviewer can grep the repo (excluding `src/i18n/sv.ts` and `src/data/`) and find no Swedish text; Swedish characters in tests and examples render correctly.

## 8c. Best practices per stack component (`FR-BP`)

All code and comments follow the established, current best practices of each technology in the stack. When this section
and official documentation differ, follow the official documentation for the installed version and mention it in the PR.
Lint rules enforce as much of this as possible; the rest is checked in review.

- `FR-BP-1` **TypeScript** (strict, typed ESLint rules from `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`):
  - No `any`, no non-null assertions (`!`) and no type assertions (`as`) unless unavoidable and commented with the reason.
  - Prefer `unknown` + narrowing for external data (imports, IndexedDB reads, `localStorage`); validate with hand-written type guards.
  - Discriminated unions for state (e.g. session state, async results `{ status: "loading" | "ready" | "error" }`), exhaustive `switch` with a `never` check.
  - `readonly` for data that must not change; `import type` for type-only imports (`verbatimModuleSyntax` is on).
  - Named exports only (no default exports, except where a tool requires it). No enums; use string-literal unions and `as const` objects.
- `FR-BP-2` **React 19**:
  - Function components and hooks only; follow the Rules of Hooks (enforced by `eslint-plugin-react-hooks`).
  - Components are pure: no side effects during render. Effects only for synchronising with external systems
    (IndexedDB, `matchMedia`, keyboard listeners), always with cleanup. Do not use effects to derive state ("You might not need an effect").
  - Keep state minimal and derive the rest during render; lift state only as far as needed; context only for app-wide concerns
    (settings, i18n, theme, data repositories) and split contexts so updates do not re-render everything.
  - Stable, unique `key`s from data IDs (never array index for editable lists).
  - Memoisation (`useMemo`, `useCallback`, `memo`) only when a measured or obvious performance need exists.
  - Accessible markup first: native elements (`button`, `label`, `dialog`, lists), correct roles, focus management on route
    change and dialogs. Error boundary around the app and around each training mode.
  - Custom hooks start with `use`, do one thing and are tested with `renderHook`.
- `FR-BP-3` **Vite**: use `import.meta.env.BASE_URL` for asset paths (never hard-code `/lovesamazingwordgame/`); static assets
  imported from modules so they are hashed; no Node APIs in browser code; keep the bundle small (check `npm run build` output).
- `FR-BP-4` **IndexedDB / `idb`**:
  - One `openDB` call with a versioned `upgrade` callback; typed schema via `DBSchema`.
  - Multi-store writes in a single transaction (`readwrite` across the needed stores); await `tx.done`.
  - Do not `await` unrelated async work inside an open transaction (it auto-commits).
  - Handle `blocked`/`blocking`/`terminated` events and quota errors; surface errors as translated toasts.
- `FR-BP-5` **CSS**: CSS variables for theme tokens (colour, spacing, radius, motion); logical properties (`margin-inline`, ...);
  mobile-first media queries; `rem` for type sizes; no `!important`; no inline styles except dynamic values;
  respect `prefers-reduced-motion` and `prefers-color-scheme`; visible `:focus-visible` styles.
- `FR-BP-6` **Testing (Vitest + Testing Library)**: follow Testing Library guiding principles (test behaviour the user sees,
  query by role/label/text, `userEvent` with `await`, `findBy*` for async UI). No testing of implementation details
  (internal state, private functions, CSS classes). Clean up mocks (`vi.restoreAllMocks`) and timers after each test.
- `FR-BP-7` **Comments and docs**: code should explain itself through names; comments explain _why_, not _what_.
  TSDoc (`/** ... */`) on every exported function, type and hook in `core/`, `storage/` and `hooks/` (purpose, params, returns, throws).
  No commented-out code, no TODOs without an issue reference.
- `FR-BP-8` **ESLint / Prettier**: zero warnings; never disable a rule globally to make code pass; an inline
  `eslint-disable-next-line` needs the rule name and a reason.
- `FR-BP-9` **GitHub Actions**: least-privilege `permissions`; pinned major versions of official actions; `npm ci` with lockfile;
  the workflow fails on any lint, format, test, coverage or build error.
- `FR-BP-10` **Git**: small, focused commits with Conventional Commit messages; one feature per branch/PR; PR description lists
  requirement IDs, test evidence and screenshots for UI changes.
- `FR-BP-11` **Accessibility**: WCAG 2.2 AA as the baseline (see section 9). `eslint-plugin-jsx-a11y` is approved but does not yet support ESLint 10; add it (without `--force`) once a compatible version exists. Until then `vitest-axe` checks every screen.

## 9. UX requirements ("smooth as silk")

- **Performance**: first load < 200 kB gzipped JS; interactions respond < 100 ms; no layout shift; no spinners for local data
  (read IndexedDB once at startup, keep it in memory/context, write through).
- **Responsive**: mobile first (360 px wide up), touch targets >= 44 px, works in portrait and landscape; desktop uses keyboard shortcuts.
- **Keyboard**: every training mode fully usable without a mouse; visible focus rings; shortcuts shown as small hints on buttons.
- **Feedback**: instant, clear, never only colour (add icons/text for colour-blind users).
- **Animations**: subtle, 150-250 ms, CSS only; honour `prefers-reduced-motion`.
- **Forgiving**: Undo for destructive actions where possible; confirm dialogs only for irreversible set deletion/reset; autosave everywhere (no "Save" bottom-of-page).
- **Empty states**: friendly, with the next action ("Create your first set").
- **Onboarding**: on first visit create a bundled example set (`src/data/example-sv-en.json`, ~20 words) and make it active, so the app is instantly usable. Written to IndexedDB through `storage/`.
- **Accessibility**: semantic HTML, ARIA where needed (live region announces correct/wrong), labels on all inputs, AA contrast, `lang` attribute follows UI language.
- **Errors**: never a blank screen. React error boundary with a friendly message and a "Reload" button. Storage errors shown as toasts.
- **Browser support**: latest 2 versions of Chrome, Edge, Firefox, Safari (iOS 16+). If IndexedDB is unavailable (e.g. private mode), show a clear message.

## 10. Testing requirements

Goal: as much of the code as possible is covered by **meaningful** tests that are linked to requirements.
Coverage numbers are a safety net, not the goal: a test must assert real behaviour (inputs, outputs, state changes,
user-visible effects). Tests that only execute code without meaningful assertions, or that snapshot everything, do not count.

### 10.1 Policy

- `FR-TEST-1` Tests are written together with the code (test-first for `core/`). A PR that adds or changes behaviour without tests is not done.
- `FR-TEST-2` Every functional requirement ID (`FR-*`) is linked to at least one test. Put the ID in the test title
  (e.g. `it("FR-WR-2: accepts alternative answers")`). Keep a traceability table in `tests/TRACEABILITY.md`
  (requirement ID -> test file(s)); update it in every PR that touches requirements.
- `FR-TEST-3` Bug fix = first a failing regression test that reproduces it, then the fix.
- `FR-TEST-4` Cover edge cases and error paths, not only the happy path: empty set, 1-3 words, duplicates, whitespace and Unicode
  input (å, ä, ö, emoji), very long text, storage failure, malformed import files, missing translation keys, no active set, reduced motion.
- `FR-TEST-5` Tests are deterministic: inject `now` and `rng`, use fake timers, never depend on real time, network or test order. No flaky tests.
- `FR-TEST-6` Tests are independent and fast (whole suite < 30 s). Each test sets up its own data via factory helpers (`tests/factories.ts`).
- `FR-TEST-7` Test code follows the same rules as production code (English, typed, no `any`, readable names, no copy-paste walls).

### 10.2 What to test per layer

| Layer                | Tooling                                                                  | Must cover                                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/` (pure logic) | Vitest unit tests                                                        | All branches: spaced repetition, session queue, direction, answer checking, quiz options, matching rounds, stats, import parsing, shuffle. Property-style tests where useful (shuffle keeps all items; options unique and contain the answer).                 |
| `storage/`           | Vitest + `fake-indexeddb` (installed, loaded in `tests/setup.vitest.ts`) | CRUD for all stores, cascade delete, transaction rollback on error, schema upgrade, export/import round-trip, localStorage mirror.                                                                                                                             |
| `hooks/`             | `renderHook` from React Testing Library                                  | State transitions and error handling with a fake storage layer.                                                                                                                                                                                                |
| `components/`        | React Testing Library + user-event                                       | Real user flows by role/label (not CSS class): create/rename/delete set with validation and undo, add/edit/remove pair, each training mode end-to-end (keyboard and pointer), session end screen, theme toggle, language switch, empty states, error boundary. |
| i18n                 | Vitest                                                                   | `sv` and `en` have identical keys; no empty strings; plural/format helpers.                                                                                                                                                                                    |
| Accessibility        | RTL queries + `vitest-axe` (installed, `toHaveNoViolations`)             | Labels, roles, focus handling, live-region announcements, no axe violations on each screen.                                                                                                                                                                    |

### 10.3 Coverage

- `@vitest/coverage-v8` is installed; `npm run test:coverage` runs in CI.
- Targets: `core/` >= 95% lines and branches; `storage/` and `hooks/` >= 90%; `components/` >= 80%; overall >= 85%.
  Enforced via `test.coverage.thresholds` in `vite.config.ts`, so CI fails when coverage drops.
- Excluded from coverage only: `main.tsx`, type-only files, and config files. Never exclude files to reach a target.

### 10.4 Conventions

- Unit tests sit next to the file (`foo.ts` -> `foo.test.ts`); UI flow tests, factories and helpers live in `tests/`.
- `describe("<unit>")` / `it("<behaviour in plain English>")`; one behaviour per test; Arrange-Act-Assert.
- Prefer user-centric queries (`getByRole`, `getByLabelText`) and `userEvent` over `fireEvent`.
- Import test APIs explicitly (`import { describe, expect, it, vi } from "vitest"`); do not rely on globals in type-checked code.
- Mock only at boundaries (storage, speech, clock, randomness). Do not mock `core/`.
- CI must pass: `npm run lint`, `npm run format:check`, tests (with coverage once added), `npm run build`.

## 11. Definition of done (per requirement and per PR)

- AC met, requirement ID referenced in commit/PR.
- Meaningful tests added/updated for all new or changed behaviour (edge cases and error paths included), linked to requirement IDs, `tests/TRACEABILITY.md` updated, coverage thresholds met; lint, format and build pass.
- Works at 360 px width and with keyboard only; both UI languages complete (no missing keys); checked in both light and dark theme; code, comments and tests in English, files UTF-8 (FR-LANG-*).
- No new dependencies unless approved; no `any`; no `console.log` left; best practices per technology followed (`FR-BP-*`).
- README and this file updated if behaviour or structure changed.

## 12. Delivery plan (suggested phases, one PR each)

- [x] **P0 Foundations**: folder structure, `types.ts`, hash router, app shell, i18n (sv/en), light/dark/system theme (`FR-THEME-*`), language/encoding conventions (`FR-LANG-*`), test tooling and `tests/TRACEABILITY.md`, error boundary, `storage/db.ts`.
- [ ] **P1 Sets**: `FR-SET-*`, `FR-ACT-*`, example set, set list/editor screens, tests.
- [ ] **P2 Core engine**: `shuffle`, `direction`, `checkAnswer`, `spacedRepetition`, `session`, `quiz`, `matching` with unit tests (no UI).
- [ ] **P3 Training shell**: `FR-TRN-*`, mode picker, session end screen, progress persistence.
- [ ] **P4 Modes**: Flashcards -> Writing -> Quiz -> Matching (one PR each).
- [ ] **P5 Stats + import/export**: `FR-ST-*`, `FR-IO-*`.
- [ ] **P6 Polish**: UX requirements audit (section 9), accessibility pass, performance check, README with screenshots, Pages deploy verified.
- [ ] **P7 Nice-to-have**: NH-1 .. NH-7 in order, as time allows.

Time budget: about 6 weeks alongside full-time work. If behind schedule cut in this order: `NH-*`, `FR-ST-3`, `FR-SET-8`/`FR-SET-9`, `FR-IO-3`, then Matching polish. Never cut tests.

## 13. Decisions and open questions

Decisions (made by the product owner, 2026-10-15):

- Progress is tracked **per word pair**, not per direction. Rationale: direction is random per card, so over time both
  directions are practised; one record keeps the model, the stats and the weekly-list use case simple. Per-direction
  accuracy may be shown in stats later without changing the schema (would need `correctAtoB`/`correctBtoA` counters, ask first).
- Accent differences are not correct by default; a setting "Ignore accents" (off by default) makes them correct (FR-WR-2).
- Approved dev dependencies: `@vitest/coverage-v8`, `fake-indexeddb`, `vitest-axe` (installed), `eslint-plugin-jsx-a11y`
  (pending ESLint 10 support, see FR-BP-11).

Open questions (ask the user, do not guess):

- Exact example set content and language for onboarding (current: ~20 Swedish/English words).
- `vite-plugin-pwa` for NH-1 (ask when NH-1 starts).

## 14. Out of scope

Accounts, cloud sync, backend, multiplayer/leaderboards, AI-generated words, analytics/tracking, native apps, images/audio per word.
