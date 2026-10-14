# CLAUDE.md

## Project
Love's Amazing Word Game is a web app for learning Swedish → English vocabulary ("glosor").
Users create or import word lists, practise them in quiz mode (sv→en and en→sv), and the app
uses spaced repetition (Leitner/SM-2) so learners spend time on the words they struggle with.
It solves a real problem: ordinary glosor apps are either ad-heavy, require accounts, or are
not tailored to Swedish speakers. Anyone can use it; all user data stays in the browser.

Deployed as a static site on GitHub Pages:
https://mattiassjobergconsidse.github.io/lovesamazingwordgame/

Repo: https://github.com/mattiassjobergconsidse/lovesamazingwordgame

## Scope (6 weeks, alongside full-time work)
Must have:
- Create, edit and delete word lists
- Quiz mode sv→en and en→sv with answer checking (case/whitespace tolerant)
- Spaced repetition scheduling per word
- Progress/statistics per list
- Import/export of lists (JSON, CSV)
- Bundled example word lists

Nice to have (only if time allows):
- PWA / offline support
- Pronunciation via the browser Web Speech API (`speechSynthesis`, sv-SE / en-GB)
- Light/dark theme

Out of scope: accounts, backend, sync between devices, multiplayer, AI-generated content.

## Tech stack
- TypeScript (strict mode): type safety makes AI-generated code easier to verify
- React + Vite: static build output, works on GitHub Pages
- IndexedDB via `idb`: persistence without a backend or accounts
- Vitest + React Testing Library: native to Vite, fast
- ESLint + Prettier: consistent style
- GitHub Actions: build and deploy to GitHub Pages on push to `main`

## Code conventions
- Prettier default settings. ESLint must pass with zero warnings.
- No `any`. Explicit types on all exported functions.
- camelCase for functions/variables, PascalCase for components and types, kebab-case not used for source files (match the exported name, e.g. `WordList.tsx`, `spacedRepetition.ts`).
- Function components with hooks only. One component per file.
- UI text in Swedish. Code, comments, identifiers and commit messages in English.
- Conventional commit style messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Architecture
- Layers:
  - `src/core/`: pure logic (quiz, spaced repetition, answer checking, import parsing). No browser APIs, no I/O.
  - `src/storage/`: ALL I/O (IndexedDB, file import/export, speech if added).
  - `src/components/`: UI. Talks to storage only through hooks in `src/hooks/`.
- Dependencies point inward: components → hooks → storage/core. `core/` imports nothing from the other layers.
- Functions do one thing. If a function needs a comment to explain what it does, split it.
- No global mutable state. Pass dependencies as arguments or via React context.
- Time and randomness are injected (e.g. `now: Date`, `rng: () => number`) so `core/` is deterministic and testable.
- Handle errors explicitly (import parsing, storage failures) and show a Swedish message to the user. Never swallow exceptions.
- Write tests alongside implementation, not after. `core/` should have high coverage.

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
- Do not remove or weaken tests to make a build pass.

## Project structure
```
/
├── CLAUDE.md
├── README.md
├── LICENSE
├── index.html
├── vite.config.ts          # base: '/lovesamazingwordgame/'
├── package.json
├── public/
├── data/                   # Bundled example word lists (JSON)
├── src/
│   ├── main.tsx
│   ├── types.ts
│   ├── components/         # UI components
│   ├── hooks/              # React hooks bridging UI and storage/core
│   ├── core/               # quiz.ts, spacedRepetition.ts, checkAnswer.ts, parseImport.ts
│   └── storage/            # db.ts, importExport.ts
├── tests/
└── .github/workflows/deploy.yml
```

## Setup
```powershell
npm install
```

## Run
```powershell
npm run dev
```

## Test
```powershell
npm test
npm run lint
```

## Build / Deploy
```powershell
npm run build   # output in dist/, deployed automatically by GitHub Actions on push to main
```
GitHub Pages: Settings → Pages → Source: **GitHub Actions**.

## Environment notes
- Developer machine is Windows with PowerShell; give commands for PowerShell.
- Git access to GitHub from the corporate network requires a proxy, configured per-URL in the global git config. Do not change git proxy settings.

## Definition of done
- Feature works in the browser and in the production build (`npm run build` + `npm run preview`).
- Tests added/updated and passing; lint passes.
- README updated if user-facing behaviour changed.
- Merged to `main` via pull request.
