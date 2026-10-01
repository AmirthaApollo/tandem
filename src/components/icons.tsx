import type { SVGProps } from "react";

export type IconName =
  | "walk"
  | "meal"
  | "play"
  | "outdoor"
  | "quiet"
  | "break"
  | "winddown"
  | "check"
  | "clock"
  | "bell"
  | "bellOff"
  | "chevronRight"
  | "chevronDown"
  | "plus"
  | "close"
  | "sun"
  | "leaf"
  | "camera"
  | "download"
  | "calendar"
  | "heart"
  | "sparkle"
  | "settings"
  | "arrowRight"
  | "edit"
  | "trash"
  | "pause"
  | "stop"
  | "playCircle"
  | "cloud"
  | "drop"
  | "stretch"
  | "home"
  | "book"
  | "chart"
  | "shield"
  | "user"
  | "paw"
  | "users"
  | "refresh"
  | "eye";

const paths: Record<IconName, JSX.Element> = {
  walk: (
    <>
      <path d="M7 20c0-3 1-5 3-6.5S13 10 13 8" />
      <circle cx="8" cy="5.5" r="2" />
      <path d="M13 8c2 0 4 1.5 4 4 0 2-1 3-1 5" />
      <path d="M11 20h5" />
    </>
  ),
  meal: (
    <>
      <path d="M4 11h16" />
      <path d="M5 11a7 7 0 0 1 14 0" />
      <path d="M8 15h8" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.5 8.5c4 3 11 3 15 0" />
      <path d="M4.5 15.5c4-3 11-3 15 0" />
    </>
  ),
  outdoor: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </>
  ),
  quiet: (
    <>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
    </>
  ),
  break: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  winddown: (
    <>
      <path d="M4 16c2-2 4-2 6 0s4 2 6 0 3-1 4-1" />
      <path d="M4 20c2-2 4-2 6 0s4 2 6 0 3-1 4-1" />
      <path d="M16 5a4 4 0 0 0 3 6 4.5 4.5 0 0 1-3-6Z" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M6 9a6 6 0 0 1 9.3-5" />
      <path d="M18 9c0 5 2 6 2 6H8" />
      <path d="M10 19a2 2 0 0 0 4 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-13 0 9-5 14-14 13Z" />
      <path d="M5 19c3-4 6-6 10-7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.3A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />,
  sparkle: (
    <>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z" />
      <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  playCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9l5 3-5 3Z" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1.2A3.5 3.5 0 0 1 17 18Z" />
    </>
  ),
  drop: <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />,
  stretch: (
    <>
      <circle cx="12" cy="4.8" r="2" />
      <path d="M12 7v6M12 13l-3.5 6M12 13l3.5 6M6.5 10H12l5.5 0" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5Z" />
      <path d="M5 5.5V20.5" />
    </>
  ),
  chart: (
    <>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="8" cy="9" rx="2" ry="2.6" />
      <ellipse cx="16" cy="9" rx="2" ry="2.6" />
      <ellipse cx="5.5" cy="14" rx="1.7" ry="2.2" />
      <ellipse cx="18.5" cy="14" rx="1.7" ry="2.2" />
      <path d="M12 13c3 0 5 2.2 5 4.2 0 1.6-1.3 2.8-3 2.8h-4c-1.7 0-3-1.2-3-2.8C7 15.2 9 13 12 13Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M17 19a5.5 5.5 0 0 0-2-4.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 22, strokeWidth = 1.6, ...rest }: IconProps & { strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export const KIND_ICON: Record<string, IconName> = {
  walk: "walk",
  meal: "meal",
  play: "play",
  outdoor: "outdoor",
  quiet: "quiet",
  break: "break",
  winddown: "winddown",
};