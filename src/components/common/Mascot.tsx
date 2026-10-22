import "./common.css";

/**
 * Volt, the app mascot (NH-8). Purely decorative, so it is hidden from assistive
 * technology. The badge uses theme tokens so it stands out on every theme.
 * `cheer` adds a one-time celebratory bounce, e.g. after a perfect session.
 */
export function Mascot({ cheer = false }: { readonly cheer?: boolean }) {
  return (
    <span
      className={cheer ? "mascot mascot-cheer" : "mascot"}
      data-testid="mascot"
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" focusable="false">
        <path
          d="M100 5 L82 45 L98 42 L78 85 L50 60 L58 100 L25 95 L55 125 L30 150 L70 145 L65 180 L100 160 L135 180 L130 145 L170 150 L145 125 L175 95 L142 100 L150 60 L122 85 L102 42 L118 45 Z"
          fill="#facc15"
        />
        <path
          d="M52 78 L100 58 L148 78 L152 120 L125 158 L100 166 L75 158 L48 120 Z"
          fill="#1d4ed8"
        />
        <path
          d="M100 58 L118 72 L112 108 L100 118 L88 108 L82 72 Z"
          fill="#60a5fa"
        />
        <path d="M100 62 L100 112" stroke="#1e3a8a" strokeWidth="3" />
        <path d="M58 78 L40 40 L62 56 L52 28 L80 66 Z" fill="#e2e8f0" />
        <path d="M142 78 L160 40 L138 56 L148 28 L120 66 Z" fill="#e2e8f0" />
        <path d="M56 100 L90 106 L84 120 L60 114 Z" fill="#facc15" />
        <path d="M144 100 L110 106 L116 120 L140 114 Z" fill="#facc15" />
        <path d="M60 104 L88 109" stroke="#fff" strokeWidth="2" />
        <path d="M140 104 L112 109" stroke="#fff" strokeWidth="2" />
        <path d="M78 140 L122 140 L110 160 L90 160 Z" fill="#1e3a8a" />
        <path
          d="M84 146 h32 M88 152 h24"
          stroke="#93c5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="62" cy="130" r="4" fill="#facc15" />
        <circle cx="138" cy="130" r="4" fill="#facc15" />
        <path
          d="M60 122 L72 130 L66 134 L76 146"
          fill="none"
          stroke="#facc15"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M140 122 L128 130 L134 134 L124 146"
          fill="none"
          stroke="#facc15"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
