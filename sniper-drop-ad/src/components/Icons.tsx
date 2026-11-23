import React from "react";

/** Stroke icon set (lucide-style, as used in the Drop Sniper sidebar). */
type IconProps = { size?: number; color?: string; stroke?: number; style?: React.CSSProperties };

const make =
  (paths: React.ReactNode) =>
  ({ size = 24, color = "currentColor", stroke = 1.8, style }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {paths}
    </svg>
  );

export const IHome = make(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </>,
);
export const ITrophy = make(
  <>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  </>,
);
export const ISearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const IBookmark = make(<path d="M6 3h12v18l-6-4-6 4V3Z" />);
export const ICalc = make(
  <>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01" />
  </>,
);
export const IMegaphone = make(
  <>
    <path d="M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
    <path d="M17 8a5 5 0 0 1 0 8M7 15l1 5h3l-1-4" />
  </>,
);
export const IUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
export const ICard = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
  </>,
);
export const ITruck = make(
  <>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>,
);
export const ISparkles = make(
  <>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z" />
    <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
  </>,
);
export const IBars = make(
  <>
    <path d="M4 20h16" />
    <path d="M7 16v-5M12 16V6M17 16v-8" />
  </>,
);
export const IArrowUR = make(<path d="M7 17 17 7M8 7h9v9" />);
export const IArrowR = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IStar = ({ size = 24, color = "#4F7BFF" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" fill={color} />
  </svg>
);
export const IHistory = make(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </>,
);
export const IBadge = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
);
export const IStore = make(
  <>
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 12v9h14v-9" />
  </>,
);
export const IBox = make(
  <>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </>,
);
export const IFactory = make(
  <>
    <path d="M3 21V10l6 3V10l6 3V6l6-3v18Z" />
    <path d="M7 17h2M12 17h2M17 17h1" />
  </>,
);
export const IHomeUser = make(
  <>
    <path d="M3 10.5 12 3l9 7.5V21H3Z" />
    <circle cx="12" cy="12.5" r="2.5" />
    <path d="M8 19a4 4 0 0 1 8 0" />
  </>,
);
export const ICheck = make(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IMoon = make(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />);
export const ISun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const IPlay = ({ size = 24, color = "#fff" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M8 5v14l11-7Z" fill={color} />
  </svg>
);
export const IHeart = make(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />);
export const IEye = make(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const IQuestion = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" />
  </>,
);
export const IGlobe = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
  </>,
);
export const IStack = make(
  <>
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
    <rect x="8.5" y="4" width="7" height="7" rx="1" />
  </>,
);
export const ICursorClick = make(<path d="M9 9l5 12 1.8-5.2L21 14Z M3 3l3 3M10 2v3M2 10h3" />);
