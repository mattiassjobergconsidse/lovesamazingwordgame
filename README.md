# Love's Amazing Word Game

A web app for learning vocabulary ("glosor") from word pairs, for example Swedish and English, but any two languages work.

[![CI/CD](https://github.com/mattiassjobergconsidse/lovesamazingwordgame/actions/workflows/deploy.yml/badge.svg)](https://github.com/mattiassjobergconsidse/lovesamazingwordgame/actions/workflows/deploy.yml)

Live: https://mattiassjobergconsidse.github.io/lovesamazingwordgame/

## Features

- Multiple named word sets with language labels; add, edit and remove word pairs (bulk add supported)
- Ten training modes, easiest to hardest: flashcards, true or false, matching, quiz, word scramble, hangman, listening, speed round, writing and boss battle
- Spaced repetition (Leitner) with a random direction per card (can be forced in settings); an option to ignore accents when checking typed answers
- Statistics per set, including the hardest words, and one-tap practice of your hardest words or the last session's mistakes
- Unlockable mini-games: a perfect Writing session (all answers correct, at least 5 words) unlocks one play of Emoji memory, Catch the falling items or Simon pattern memory
- Trophies for milestones (streaks, mastered words, perfect sessions, completing each mode), with a celebration when one unlocks
- Twelve selectable mascots that react to your answers, streaks and trophies (can be turned off); the Boss Battle uses a mascot as the boss
- Boss Battle: the words you got wrong become a boss with a health bar that you defeat by answering them correctly
- A playful, kid-friendly look with emojis, rounded shapes and small animations (respects reduced motion)
- Word Scramble: the answer's letters are shuffled into tiles that you tap or type in order (including å/ä/ö), with a hint and a "give up" option
- Hangman: guess the hidden word letter by letter with an on-screen or physical keyboard, with a limited number of wrong guesses drawn as a figure
- Listening: the app speaks a word in one language and you pick or type its translation in the other (needs browser speech support and a voice language on the set)
- True or False: judge whether a proposed translation is right, by button, swipe or key
- Speed Round: a 60-second quiz sprint with a combo multiplier and a best score per set (or a no-timer practice variant)
- Import and export as JSON or CSV; trophies are included in the export, while best scores stay local to the browser
- Installable and works offline after the first load (PWA, hand-written service worker)
- Pronunciation: speaker button on cards using the browser's voices, with optional auto-play
- Optional short answer sounds (generated in the browser) and vibration on mobile, off by default
- Share a set as a link (the words are compressed into the address, no server involved) and import it from the link
- A home screen with today's words to practise, one-tap training modes, a daily goal (5 to 50 answers, set in Settings), streak and progress snapshot
- Print a set's word list as a plain table from the set editor
- Keyboard friendly, works from 360 px width, WCAG 2.2 AA as the baseline

## Getting started

### Requirements

- Node.js 22 or newer (the version used in CI) and npm
- A modern browser with IndexedDB (latest Chrome, Edge, Firefox or Safari 16+)
- No external services, API keys or accounts

### Installation

```powershell
git clone https://github.com/mattiassjobergconsidse/lovesamazingwordgame
cd lovesamazingwordgame
npm install
```

### Configuration

None. The app has no environment variables and no secrets, so there is no `.env` file. The only build setting is the Pages base path `/lovesamazingwordgame/` in `vite.config.ts`. Change it if you host the app under another path.

### Run

```powershell
npm run dev            # http://localhost:5173/lovesamazingwordgame/
npm test               # run tests once
npm run test:coverage  # tests with coverage thresholds
npm run lint
npm run format         # Prettier write (format:check only checks)
npm run build          # output in dist/
npm run preview        # serve the production build
```

### Deployment

Every push to `main` and every pull request against `main` runs lint, format check, tests with coverage, a dependency audit and a build in GitHub Actions (`.github/workflows/deploy.yml`). Pushes to `main` that pass are deployed to GitHub Pages. The pipeline needs no secrets: Pages deployment uses the built-in `GITHUB_TOKEN` and OIDC permissions.

## Architecture

The code is layered, with the dependency direction `components -> hooks -> storage | core`. `core/` holds pure logic (spaced repetition, answer checking, session queue, import parsing, game rules) with no browser APIs, so it is easy to unit test. `storage/` wraps IndexedDB, `localStorage`, speech, audio and file access. `hooks/` connects them to React state, and `components/` renders the screens. See [CLAUDE.md](CLAUDE.md) for the project rules and [SPEC.md](SPEC.md) for the full specification.

```
src/
├── components/   # React screens per area (home, sets, train, games, stats, settings, ...)
├── hooks/        # State and side-effect hooks between UI and storage
├── core/         # Pure logic with unit tests next to each file
├── storage/      # IndexedDB (idb), localStorage, speech, audio, file and share-link I/O
├── i18n/         # Swedish and English dictionaries
├── data/         # Bundled example set
└── router.ts     # Hash router and training mode list
tests/            # UI flow tests, factories and the requirement traceability matrix
public/           # PWA manifest, icons and service worker
```

## Tech stack

| Component | Choice                       | Reason                                                     |
| --------- | ---------------------------- | ---------------------------------------------------------- |
| UI        | React 19 + TypeScript        | Typed components and hooks                                 |
| Build     | Vite                         | Fast dev server and a small static build                   |
| Storage   | IndexedDB (idb)              | Offline, no backend or accounts needed                     |
| Tests     | Vitest, Testing Library, axe | Unit, UI flow and accessibility tests with coverage gates  |
| CI/CD     | GitHub Actions + Pages       | Free hosting of a static app, deploy on every green `main` |

## Limitations

- Data lives only in the browser it was created in. There is no sync between devices; use export/import or share links to move word lists.
- Clearing site data deletes everything, so export a backup of important lists.
- Pronunciation and the Listening mode depend on the voices installed in the browser and operating system.
- Share links hold the whole word list in the address, so very large sets do not fit (the link is limited to 200,000 characters).
- Imports are limited to 10 MB per file, 200 sets and 20,000 words per file. CSV export prefixes cells that start with `=`, `+`, `-` or `@` with an apostrophe so spreadsheet programs do not run them as formulas; the import removes it again.
- The production build sets a Content-Security-Policy (no third-party requests are allowed). Best scores stay local and are not exported.
- Open points from the quality review are tracked in `codereview_security.md`, `codereview_code_quality.md` and `codereview_architecture.md`.

## Built with

Claude Code (agentic development) as part of the course Next-Generation Software Development with AI.

## License

See [LICENSE](LICENSE).
