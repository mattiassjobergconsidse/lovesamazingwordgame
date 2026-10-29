# Love's Amazing Word Game

A web app for learning vocabulary ("glosor") from word pairs, for example Swedish â†” English, but any two
languages work. Create or import word lists (one per week, for instance), practise them and let spaced
repetition focus on the words you find hard. All data stays in your browser. No accounts, no backend, no tracking.

Live: https://mattiassjobergconsidse.github.io/lovesamazingwordgame/

## Features

- Multiple named word sets with language labels; add, edit and remove word pairs (bulk add supported)
- Five training modes: flashcards, quiz, matching, writing and hangman
- Spaced repetition (Leitner) with a random direction per card (can be forced in settings)
- Statistics per set, including the hardest words
- Import and export as JSON or CSV
- UI in Swedish and English; light, dark or system theme
- A bundled example set on first visit
- Installable and works offline after the first load (PWA, hand-written service worker)
- Pronunciation: speaker button on cards using the browser's voices, with optional auto-play
- Extra Ocean and Sunset themes and smooth colour transitions when switching theme
- Optional short answer sounds (generated in the browser) and vibration on mobile, off by default
- Share a set as a link (the words are compressed into the address, no server involved) and import it from the link
- Press `?` (or use the header button) to see the keyboard shortcuts
- A home screen with today's words to practise, one-tap training modes, a daily goal (5 to 50 answers, set in Settings), streak and progress snapshot
- Print a set's word list as a plain table from the set editor
- Keyboard friendly, works from 360 px width, WCAG 2.2 AA as the baseline

## Tech stack

TypeScript, React, Vite, IndexedDB (idb), Vitest, GitHub Actions + GitHub Pages.

## Development

```powershell
npm install
npm run dev      # http://localhost:5173/lovesamazingwordgame/
npm test               # run tests once
npm run test:coverage  # tests with coverage thresholds
npm run lint
npm run format         # Prettier write (format:check only checks)
npm run build          # output in dist/
npm run preview        # serve the production build
```

Pushes to `main` are linted, tested, built and deployed to GitHub Pages by GitHub Actions.

See [CLAUDE.md](CLAUDE.md) for architecture principles and project rules.

## License

See [LICENSE](LICENSE).
