import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  forward: (
    <path d="M2.5 1.2c0-1 1.1-1.6 2-1.1L12 4.9c.9.5.9 1.7 0 2.2L4.5 9.9c-.9.5-2-.1-2-1.1z" />
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.5 5.5l13 13" />
    </>
  ),
  bolt: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  sliders: <path d="M3 5h18M6 12h12M10 19h4" />,
  collapse: <path d="M5 9h14M5 15h14" />,
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.6.66 1.03 1.28 1.03H21a2 2 0 1 1 0 4h-.09c-.62 0-1.14.43-1.28 1.03z" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0l-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7M10 11v6M14 11v6" />,
  send: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  diff: (
    <>
      <rect x="3" y="5" width="8" height="14" rx="1.5" />
      <rect x="13" y="5" width="8" height="14" rx="1.5" />
      <path d="M7 9v2M18 12h2M18 16v2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3L2.5 20h19z" />
      <path d="M12 9v5" />
      <path d="M12 17.5v.5" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />,
  shield: <path d="M12 2l8 3.5V11c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5.5z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  keyboard: <path d="M3 8h5v5H3zM10 8h3v5h-3zM15 8h6v5h-6zM3 15h18v3H3z" />,
  puzzle: (
    <path d="M10 3a2 2 0 0 1 4 0v1h4a1 1 0 0 1 1 1v4h1a2 2 0 1 1 0 4h-1v4a1 1 0 0 1-1 1h-4a2 2 0 1 0-4 0H6a1 1 0 0 1-1-1v-4H4a2 2 0 1 1 0-4h1V5a1 1 0 0 1 1-1z" />
  ),
  move: <path d="M5 9l-2 3 2 3M19 9l2 3-2 3M8 5l4-2 4 2M8 19l4 2 4-2M12 22V2" />,
  code: <path d="M8.5 6L3 12l5.5 6M15.5 6L21 12l-5.5 6" />,
};

const FILLED = new Set(["forward", "bolt", "check"]);

interface IconProps {
  name: keyof typeof P | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 15, strokeWidth = 1.8, className }: IconProps) {
  if (!(name in P)) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={FILLED.has(name) ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={FILLED.has(name) ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}