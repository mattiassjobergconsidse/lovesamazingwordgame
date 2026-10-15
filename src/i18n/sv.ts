import type { MessageKey } from "./en";

/** Swedish dictionary. The compiler fails if a key from `en.ts` is missing. */
export const sv: Record<MessageKey, string> = {
  "app.title": "Love's Amazing Word Game",
  "a11y.skipToContent": "Hoppa till huvudinnehållet",
  "nav.label": "Huvudnavigering",
  "nav.home": "Hem",
  "nav.sets": "Listor",
  "nav.train": "Öva",
  "nav.stats": "Statistik",
  "nav.settings": "Inställningar",
  "route.setEditor": "Redigera lista",
  "route.train.flashcards": "Kort",
  "route.train.quiz": "Flerval",
  "route.train.matching": "Para ihop",
  "route.train.writing": "Skriva",
  "screen.comingSoon": "Den här sidan kommer snart.",
  "header.switchLanguage": "Byt språk",
  "header.switchLanguage.target": "EN",
  "header.theme.toLight": "Byt till ljust tema",
  "header.theme.toDark": "Byt till mörkt tema",
  "activeSet.label": "Aktiv lista",
  "activeSet.none": "Ingen lista vald",
  "activeSet.choose": "Välj lista",
  "wordCount.one": "{count} ord",
  "wordCount.other": "{count} ord",
  "error.title": "Något gick fel",
  "error.message":
    "Appen råkade ut för ett oväntat fel. Det brukar räcka att ladda om sidan.",
  "error.reload": "Ladda om",
  "storage.error.unavailable":
    "Lagring finns inte i den här webbläsaren (privat läge?). Dina data kan inte sparas.",
  "storage.error.blocked":
    "En uppdatering väntar. Stäng andra flikar med appen för att fortsätta.",
  "storage.error.failed": "Det gick inte att spara dina data. Försök igen.",
};
