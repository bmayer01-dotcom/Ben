// Einfache Linienzeichnungen, 120×120, weiß, 4 px.
import React from "react";

const L = {
  fill: "none",
  stroke: "#FFFFFF",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Burj = () => (
  <g {...L}>
    <path d="M40 116 V72 H46 V50 H52 V32 H56 V16 L60 2 L64 16 V32 H68 V50 H74 V72 H80 V116 Z" />
    <path d="M20 116 H100" />
  </g>
);

const S21 = () => (
  <g {...L}>
    <path d="M8 82 C30 82 30 70 60 70 C90 70 90 82 112 82" />
    <circle cx="30" cy="96" r="9" />
    <circle cx="60" cy="92" r="9" />
    <circle cx="90" cy="96" r="9" />
    <path d="M8 82 V112 M112 82 V112 M4 112 H116" />
  </g>
);

const Atom = () => (
  <g {...L}>
    <ellipse cx="60" cy="60" rx="52" ry="18" />
    <ellipse cx="60" cy="60" rx="52" ry="18" transform="rotate(60 60 60)" />
    <ellipse cx="60" cy="60" rx="52" ry="18" transform="rotate(120 60 60)" />
    <circle cx="60" cy="60" r="6" fill="#FFFFFF" />
  </g>
);

const Iss = () => (
  <g {...L}>
    <path d="M6 60 H114" />
    <rect x="12" y="24" width="26" height="28" />
    <rect x="12" y="68" width="26" height="28" />
    <rect x="82" y="24" width="26" height="28" />
    <rect x="82" y="68" width="26" height="28" />
    <path d="M25 24 V52 M25 68 V96 M95 24 V52 M95 68 V96" />
    <rect x="48" y="48" width="24" height="24" rx="3" />
    <path d="M54 72 V94 H66 V72" />
  </g>
);

const Kran = () => (
  <g {...L}>
    <path d="M6 112 V90 L18 78 L30 90 V112 M30 112 V92 L42 80 L54 92 V112 M54 112 V90 L66 78 L78 90 V112" />
    <path d="M2 112 H118" />
    <path d="M92 112 V22 M70 22 H116 M92 22 V8 L70 22 M92 8 L116 22" />
    <path d="M108 22 V44 M104 44 H112" />
  </g>
);

const Rakete = () => (
  <g {...L}>
    <path d="M60 2 V12" />
    <path d="M54 26 L60 12 L66 26" />
    <path d="M50 30 L54 26 H66 L70 30 V96 H50 Z" />
    <path d="M50 52 H70 M50 74 H70" />
    <path d="M50 84 L40 108 H50 V96 M70 84 L80 108 H70 V96" />
    <path d="M54 96 L52 112 M66 96 L68 112" />
  </g>
);

const Kleeblatt = () => (
  <g {...L}>
    <path d="M60 2 V118 M2 60 H118" />
    <circle cx="84" cy="36" r="18" />
    <circle cx="36" cy="36" r="18" />
    <circle cx="36" cy="84" r="18" />
    <circle cx="84" cy="84" r="18" />
  </g>
);

const Rack = () => (
  <g {...L}>
    <rect x="28" y="4" width="64" height="112" rx="6" />
    <path d="M28 26 H92 M28 48 H92 M28 70 H92" />
    <circle cx="40" cy="15" r="2.5" fill="#FFFFFF" />
    <circle cx="40" cy="37" r="2.5" fill="#FFFFFF" />
    <circle cx="40" cy="59" r="2.5" fill="#FFFFFF" />
    <path d="M52 15 H80 M52 37 H80 M52 59 H80" />
    <rect x="48" y="80" width="24" height="24" rx="2" />
    <rect x="55" y="87" width="10" height="10" />
    <path d="M42 86 H48 M42 98 H48 M72 86 H78 M72 98 H78" />
  </g>
);

const ICONS: Record<string, React.FC> = {
  burj: Burj,
  s21: S21,
  manhattan: Atom,
  iss: Iss,
  marshall: Kran,
  apollo: Rakete,
  interstate: Kleeblatt,
  mag7: Rack,
};

export const ProjektIcon: React.FC<{ id: string }> = ({ id }) => {
  const C = ICONS[id];
  return <C />;
};
