// 0–60 "AI in Context" title, 60–165 headline with subline.
import React from "react";
import { AbsoluteFill } from "remotion";
import { DS, grotesk, inter, mono } from "./design.ts";
import { clamp01, expoOut, prog, Woerter, Zeile } from "./ui.tsx";
import { H, HEADLINE_ENDE, INTRO_ENDE, W } from "./world.ts";

const Hintergrund: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    <defs>
      <pattern id="raster" width={36} height={36} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${-f * 0.5})`}>
        <circle cx={18} cy={18} r={1.3} fill={DS.foreground} />
      </pattern>
      <radialGradient id="rastermaske" cx="0.5" cy="0.45" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <mask id="rm">
        <rect width={W} height={H} fill="url(#rastermaske)" />
      </mask>
      <radialGradient id="introglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={DS.primary} stopOpacity="0.32" />
        <stop offset="1" stopColor={DS.primary} stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#raster)" mask="url(#rm)" />
    <ellipse cx={W / 2} cy={H * 0.45} rx={620 + 40 * Math.sin(f / 18)} ry={520} fill="url(#introglow)" />
  </svg>
);

// Letters land one by one out of blur.
const Buchstaben: React.FC<{ f: number; start: number; text: string; abstand?: number; style?: React.CSSProperties; farbe?: string }> = ({
  f,
  start,
  text,
  abstand = 2,
  style,
  farbe,
}) => (
  <div style={{ display: "flex", justifyContent: "center", ...style }}>
    {[...text].map((ch, i) => {
      const e = expoOut(prog(f, start + i * abstand, 20));
      return (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: clamp01(e * 1.4), color: farbe, transform: `translateY(${(1 - e) * 70}px) scale(${1.35 - 0.35 * e})`, filter: `blur(${(1 - e) * 14}px)` }}>
          {ch}
        </span>
      );
    })}
  </div>
);

const Titel: React.FC<{ f: number }> = ({ f }) => {
  const aus = expoOut(prog(f, INTRO_ENDE - 14, 16));
  const linie = expoOut(prog(f, 20, 22));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 430, textAlign: "center", opacity: 1 - aus, transform: `translateY(${-aus * 60}px) scale(${1 - aus * 0.08})`, filter: `blur(${aus * 10}px)` }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <Buchstaben f={f} start={2} text="AI" abstand={4} farbe={DS.primary} style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 250, lineHeight: "240px", letterSpacing: "-0.04em", textShadow: "0 0 60px rgba(76,214,118,0.55)" }} />
      </div>
      <Buchstaben f={f} start={10} text="in Context" abstand={1.5} style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 104, lineHeight: "116px", letterSpacing: "-0.02em", color: DS.foreground }} />
      <div style={{ margin: "26px auto 0", width: 460 * linie, height: 4, borderRadius: 2, background: DS.primary, boxShadow: `0 0 20px ${DS.primary}` }} />
    </div>
  );
};

const Headline: React.FC<{ f: number }> = ({ f }) => {
  const t0 = INTRO_ENDE - 2;
  const aus = expoOut(prog(f, HEADLINE_ENDE - 14, 14));
  const zahl = Math.round(780 * expoOut(prog(f, t0 + 2, 32)));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 360, textAlign: "center", opacity: 1 - aus, transform: `translateY(${-aus * 50}px)` }}>
      <Zeile f={f} start={t0} dauer={18}>
        <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 132, lineHeight: "146px", letterSpacing: "-0.035em", color: DS.primary, textShadow: "0 0 55px rgba(76,214,118,0.45)", fontVariantNumeric: "tabular-nums" }}>
          ${zahl} billion
        </div>
      </Zeile>
      <Woerter f={f} start={t0 + 12} abstand={2} text="is what the Mag7 are investing in AI in 2026." style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 54, lineHeight: "64px", marginTop: 14, color: DS.foreground }} />
      <Woerter f={f} start={t0 + 36} abstand={2} text="How does this compare to humanity’s biggest projects?" style={{ fontFamily: inter, fontSize: 42, lineHeight: "54px", marginTop: 48, color: DS.foreground, opacity: 0.86 }} />
      <Zeile f={f} start={t0 + 54} style={{ marginTop: 16 }}>
        <div style={{ fontFamily: mono, fontSize: 36, color: DS.muted }}>(adjusted for inflation)</div>
      </Zeile>
    </div>
  );
};

export const Intro: React.FC<{ f: number }> = ({ f }) => {
  const aus = prog(f, HEADLINE_ENDE - 6, 14);
  if (aus >= 1) return null;
  return (
    <AbsoluteFill style={{ background: DS.background, opacity: 1 - aus }}>
      <Hintergrund f={f} />
      {f < INTRO_ENDE + 4 ? <Titel f={f} /> : null}
      {f >= INTRO_ENDE - 4 ? <Headline f={f} /> : null}
    </AbsoluteFill>
  );
};
