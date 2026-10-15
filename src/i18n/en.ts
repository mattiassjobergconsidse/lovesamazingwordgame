/** English dictionary. It defines the set of keys; `sv.ts` must provide every one of them. */
export const en = {
  "app.title": "Love's Amazing Word Game",
  "a11y.skipToContent": "Skip to main content",
  "nav.label": "Main navigation",
  "nav.home": "Home",
  "nav.sets": "Sets",
  "nav.train": "Train",
  "nav.stats": "Statistics",
  "nav.settings": "Settings",
  "route.setEditor": "Edit set",
  "route.train.flashcards": "Flashcards",
  "route.train.quiz": "Quiz",
  "route.train.matching": "Matching",
  "route.train.writing": "Writing",
  "screen.comingSoon": "This screen is coming soon.",
  "header.switchLanguage": "Switch language",
  "header.switchLanguage.target": "SV",
  "header.theme.toLight": "Switch to light theme",
  "header.theme.toDark": "Switch to dark theme",
  "activeSet.label": "Active set",
  "activeSet.none": "No set selected",
  "activeSet.choose": "Choose set",
  "wordCount.one": "{count} word",
  "wordCount.other": "{count} words",
  "error.title": "Something went wrong",
  "error.message":
    "The app hit an unexpected problem. Reloading usually fixes it.",
  "error.reload": "Reload",
  "storage.error.unavailable":
    "Storage is not available in this browser (private mode?). Your data cannot be saved.",
  "storage.error.blocked":
    "An update is waiting. Close other tabs of this app to continue.",
  "storage.error.failed": "Could not save your data. Please try again.",
} as const satisfies Record<string, string>;

/** Every translatable message key. */
export type MessageKey = keyof typeof en;
