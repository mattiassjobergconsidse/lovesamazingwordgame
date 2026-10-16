import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "../../i18n";
import { Dialog } from "../common/Dialog";
import { isModalOpen, isTypingTarget } from "../common/modalOpen";

interface Shortcut {
  readonly keys: readonly string[];
  readonly label: MessageKey;
}

interface ShortcutGroup {
  readonly heading: MessageKey;
  readonly items: readonly Shortcut[];
}

const GROUPS: readonly ShortcutGroup[] = [
  {
    heading: "shortcuts.general",
    items: [
      { keys: ["?"], label: "shortcuts.help" },
      { keys: ["Esc"], label: "shortcuts.leave" },
    ],
  },
  {
    heading: "shortcuts.flashcards",
    items: [
      { keys: ["Space"], label: "shortcuts.flip" },
      { keys: ["→", "2"], label: "shortcuts.knew" },
      { keys: ["←", "1"], label: "shortcuts.notYet" },
    ],
  },
  {
    heading: "shortcuts.quiz",
    items: [
      { keys: ["1–9"], label: "shortcuts.choose" },
      { keys: ["Enter"], label: "shortcuts.next" },
    ],
  },
  {
    heading: "shortcuts.matching",
    items: [
      { keys: ["1–9"], label: "shortcuts.matchLeft" },
      { keys: ["A–Z"], label: "shortcuts.matchRight" },
    ],
  },
];

/** Header button plus the `?` key: opens an overlay that lists the keyboard shortcuts. */
export function ShortcutHelp() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "?" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTypingTarget(event.target) ||
        isModalOpen()
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label={t("shortcuts.open")}
        aria-keyshortcuts="?"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <Dialog
          title={t("shortcuts.title")}
          onClose={() => {
            setOpen(false);
          }}
        >
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <h3>{t(group.heading)}</h3>
              <dl className="shortcut-list">
                {group.items.map((item) => (
                  <div key={item.label} className="shortcut-row">
                    <dt>
                      {item.keys.map((key, index) => (
                        <span key={key}>
                          {index > 0 && " / "}
                          <kbd>{key}</kbd>
                        </span>
                      ))}
                    </dt>
                    <dd>{t(item.label)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <button
            type="button"
            className="dialog-close"
            onClick={() => {
              setOpen(false);
            }}
          >
            {t("common.close")}
          </button>
        </Dialog>
      )}
    </>
  );
}
