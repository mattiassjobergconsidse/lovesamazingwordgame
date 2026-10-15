# CLAUDE.md

## Project

Love's Amazing Word Game is a language-independent web app for learning vocabulary ("glosor") from word pairs
(e.g. Swedish ↔ English, but any two languages work). Users create multiple named word sets (e.g. one per week),
choose the active set and practise it in four modes: flashcards, quiz, matching and writing. Spaced repetition
(Leitner) decides which words to practise; the direction (A→B or B→A) is random per card.

It solves a real problem: typical vocabulary apps are ad-heavy, require accounts or are not flexible enough for
weekly word lists. Anyone can use it; all user data stays in the browser.

- Live: https://mattiassjobergconsidse.github.io/lovesamazingwordgame/
- Repo: https://github.com/mattiassjobergconsidse/lovesamazingwordgame

## Specification

The full feature spec, domain model, requirement IDs, testing requirements and delivery plan are in
[SPEC.md](SPEC.md). Read it before planning or implementing. Do not implement anything outside it without asking.
This file (CLAUDE.md) holds the rules; if the two conflict, CLAUDE.md wins and you ask the user.

## Scope (6 weeks, alongside full-time work)

Must have (details in SPEC.md section 6):

- Multiple word sets with mandatory, editable name and language labels; add/edit/remove word pairs
- Active set selection before any training
- Four training modes: flashcards, quiz, matching, writing
- Spaced repetition ordering, random direction per card (can be forced in settings)
- Statistics per set
- Import/export (JSON, CSV)
- UI in Swedish and English (switchable)
- Light/dark/system theme (toggle in header and in settings)
- Bundled example set on first visit

Nice to have (only if time allows, SPEC.md section 8): PWA/offline, pronunciation (Web Speech API),
theme polish, sounds/haptics, share set via link, shortcut help, print view.

Out of scope: accounts, backend, sync between devices, multiplayer, AI-generated content, analytics.

## Tech stack

- TypeScript (strict mode): type safety makes AI-generated code easier to verify
- React 19 + Vite: static build output, works on GitHub Pages
- IndexedDB via `idb`: persistence without a backend or accounts
- Vitest + React Testing Library + user-event + jest-dom: native to Vite, fast
- ESLint + Prettier: consistent style
- GitHub Actions: lint, test and build on every PR; deploy to GitHub Pages on push to `main`

## Code conventions

- Prettier default settings (`npm run format`). ESLint must pass with zero warnings.
- Follow current best practices of every technology in the stack (TypeScript, React 19, Vite, IndexedDB/`idb`, CSS,
  Vitest/Testing Library, GitHub Actions). Concrete rules: SPEC.md section 8c (`FR-BP-*`). ESLint uses typed
  `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` rules; never disable a rule to make code pass.
- Comments explain _why_, not _what_. TSDoc on exported functions, types and hooks in `core/`, `storage/` and `hooks/`.
  No commented-out code.
- No `any`. Explicit types on all exported functions.
- camelCase for functions/variables, PascalCase for components and types.
  File names match their main export (`WordList.tsx`, `spacedRepetition.ts`).
- Function components with hooks only. One component per file.
- Language: all code, comments, identifiers, test names, docs and commit messages are in English.
  Only `src/i18n/sv.ts` and bundled word data in `src/data/` may contain Swedish.
- Encoding: all files UTF-8 without BOM, LF line endings (`.gitattributes`). Write å/ä/ö directly, never escaped.
- UI text only via the hand-written typed dictionaries in `src/i18n/` (no hard-coded UI strings, no i18n library).
- Conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) referencing requirement IDs.

## Architecture

- Layers:
  - `src/core/`: pure logic (spaced repetition, sessions, direction, answer checking, quiz, matching, import parsing).
    No browser APIs, no I/O, no `Date.now()` or `Math.random()`.
  - `src/storage/`: ALL I/O (IndexedDB, file import/export, localStorage theme mirror, speech if added).
  - `src/hooks/`: bridge between UI and storage/core.
  - `src/components/`: UI only. Never calls storage directly.
- Dependencies point inward: components → hooks → storage/core. `core/` imports nothing from the other layers.
- Functions do one thing. If a function needs a comment to explain what it does, split it.
- No global mutable state. Pass dependencies as arguments or via React context.
- Time and randomness are injected (`now: number` epoch ms, `rng: () => number`) so `core/` is deterministic.
- Handle errors explicitly (import parsing, storage failures) and show a translated message. Never swallow exceptions.
- All colours via theme CSS variables; no hard-coded colours in components.

## Testing

- Write tests together with the code (test-first for `core/`). A change without meaningful tests is not done.
- As much code as possible is covered by meaningful tests: real assertions, edge cases and error paths.
- Every `FR-*` requirement in SPEC.md is linked to at least one test (ID in the test title); keep `tests/TRACEABILITY.md` updated.
- Bug fix = failing regression test first. Tests are deterministic (inject time and randomness, fake timers).
- Coverage targets and conventions: SPEC.md section 10.

## Rules (what the agent must NOT do)

- Do not add or swap dependencies without asking first.
- Do not add a backend, server, database server or external API. The app must remain fully static.
- Do not change the stored data format without a migration and asking first.
- Do not send user data to third parties. No analytics, tracking or external fonts/CDNs.
- Never commit directly to `main`. Use feature branches (`feature/<name>`) and pull requests.
- Do not create config files beyond what the tooling requires.
- Do not refactor unrelated code when fixing a bug or adding a feature.
- Do not hard-code the Pages base path anywhere except `vite.config.ts` (`base: '/lovesamazingwordgame/'`).
- Do not commit secrets, `.env` files or build output (`dist/`).
- Do not remove, skip or weaken tests, or lower coverage thresholds, to make a build pass.

## Project structure

```
/
├── CLAUDE.md
├── SPEC.md
├── README.md
├── LICENSE
├── index.html
├── vite.config.ts          # base path + Vitest config
├── package.json
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.ts           # hand-written hash router
│   ├── types.ts
│   ├── data/               # bundled example set (JSON)
│   ├── i18n/               # sv.ts, en.ts, index.ts
│   ├── core/               # pure logic (+ *.test.ts next to each file)
│   ├── storage/            # all I/O
│   ├── hooks/
│   └── components/
├── tests/                  # setup, factories, UI flow tests, TRACEABILITY.md
└── .github/workflows/deploy.yml
```

## Commands (PowerShell)

```powershell
npm install
npm run dev            # http://localhost:5173/lovesamazingwordgame/
npm test               # run tests once
npm run test:watch
npm run lint
npm run format         # Prettier write (format:check only checks)
npm run build          # output in dist/
npm run preview        # serve the production build
```

Deploy: automatic by GitHub Actions on push to `main` (Settings → Pages → Source: GitHub Actions).

## Environment notes

- Developer machine is Windows with PowerShell; give commands for PowerShell.
- Do not change git configuration (including proxy settings).
- The first test run after install can take over a minute (antivirus scanning `node_modules`); later runs take seconds. Do not change pool or timeout settings because of a slow first run.

## Definition of done

See SPEC.md section 11. In short: acceptance criteria met, meaningful tests linked to requirement IDs,
lint/test/build green, works with keyboard and at 360 px, both UI languages and both themes checked,
merged to `main` via pull request.
