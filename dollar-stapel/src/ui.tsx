// UI-Bausteine im mAI-Consult-Stil: Glas-Karten, Masken-Reveals, Chips.
import React from "react";
import { DS, mono } from "./design.ts";

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t)));
export const prog = (f: number, start: number, dauer: number) => clamp01((f - start) / dauer);

// Text gleitet aus einer Maske nach oben.
export const Zeile: React.FC<{ f: number; start: number; dauer?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  f,
  start,
  dauer = 16,
  style,
  children,
}) => {
  const e = expoOut(prog(f, start, dauer));
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", ...style }}>
      <div style={{ transform: `translateY(${(1 - e) * 105}%)`, opacity: clamp01(e * 2) }}>{children}</div>
    </div>
  );
};

// Wort für Wort aus der Maske; `hervor` färbt einzelne Wörter (Index-Liste).
export const Woerter: React.FC<{
  f: number;
  start: number;
  text: string;
  abstand?: number;
  style?: React.CSSProperties;
  hervor?: number[];
  hervorFarbe?: string;
}> = ({ f, start, text, abstand = 2, style, hervor = [], hervorFarbe = DS.primary }) => (
  <div style={style}>
    {text.split(" ").map((w, i) => {
      const e = expoOut(prog(f, start + i * abstand, 16));
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.1em", marginRight: "0.26em" }}>
          <span style={{ display: "inline-block", transform: `translateY(${(1 - e) * 110}%)`, color: hervor.includes(i) ? hervorFarbe : undefined }}>{w}</span>
        </span>
      );
    })}
  </div>
);

// Glas-Karte mit Verlaufsrand; Wipe von unten nach oben.
export const Glas: React.FC<{ akzent?: boolean; wipe?: number; style?: React.CSSProperties; innen?: React.CSSProperties; children: React.ReactNode }> = ({
  akzent = false,
  wipe = 1,
  style,
  innen,
  children,
}) => {
  const rand = akzent
    ? `linear-gradient(140deg, ${DS.primary} 0%, rgba(76,214,118,0.25) 45%, rgba(76,214,118,0.6) 100%)`
    : "linear-gradient(140deg, rgba(239,243,241,0.32) 0%, rgba(239,243,241,0.06) 45%, rgba(239,243,241,0.16) 100%)";
  return (
    <div
      style={{
        padding: 1.5,
        borderRadius: 16,
        background: rand,
        boxShadow: akzent ? "0 24px 60px rgba(0,0,0,0.45), 0 0 60px rgba(76,214,118,0.18)" : "0 24px 60px rgba(0,0,0,0.45)",
        clipPath: `inset(${(1 - wipe) * 100}% 0 0 0 round 16px)`,
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: 14.5,
          background: "linear-gradient(180deg, rgba(17,24,20,0.86) 0%, rgba(11,17,14,0.92) 100%)",
          backdropFilter: "blur(14px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          color: DS.foreground,
          ...innen,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Kleines Mono-Label mit Punkt, z. B. „03 / 07“.
export const Eyebrow: React.FC<{ text: string; akzent?: boolean; style?: React.CSSProperties }> = ({ text, akzent, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: mono, fontSize: 36, letterSpacing: "0.06em", color: DS.muted, textTransform: "uppercase", ...style }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: akzent ? DS.primary : DS.foreground, boxShadow: akzent ? `0 0 14px ${DS.primary}` : "none", opacity: akzent ? 1 : 0.7 }} />
    {text}
  </div>
);
