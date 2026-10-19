// 0–60 "AI in Context" title, 60–165 headline with subline.
import React from "react";
import { AbsoluteFill } from "remotion";
import { DS, grotesk, inter } from "./design.ts";
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

// ---------- Headline, beat 1: the number ----------
const B1 = INTRO_ENDE - 2;
const B1_AUS = B1 + 92;
const Beat1: React.FC<{ f: number }> = ({ f }) => {
  const aus = expoOut(prog(f, B1_AUS, 16));
  if (aus >= 1) return null;
  const zahl = Math.round(780 * expoOut(prog(f, B1 + 2, 34)));
  const ai = expoOut(prog(f, B1 + 34, 14));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 430, textAlign: "center", opacity: 1 - aus, transform: `translateY(${-aus * 120}px) scale(${1 - aus * 0.12})`, filter: aus > 0 ? `blur(${aus * 12}px)` : undefined }}>
      <Zeile f={f} start={B1} dauer={18}>
        <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 150, lineHeight: "164px", letterSpacing: "-0.04em", color: DS.primary, textShadow: "0 0 60px rgba(76,214,118,0.5)", fontVariantNumeric: "tabular-nums" }}>
          ${zahl} billion
        </div>
      </Zeile>
      <div style={{ position: "relative", marginTop: 18 }}>
        <Woerter f={f} start={B1 + 14} abstand={2} text="is what the Mag7 are investing" style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 56, lineHeight: "68px", color: DS.foreground }} />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginTop: 6 }}>
          <Woerter f={f} start={B1 + 26} text="in" style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 56, lineHeight: "68px" }} />
          {/* "AI" lands in a glowing pill */}
          <span style={{ display: "inline-block", fontFamily: grotesk, fontWeight: 700, fontSize: 56, lineHeight: "64px", padding: "2px 22px", borderRadius: 14, color: DS.background, background: DS.primary, boxShadow: `0 0 ${30 * ai}px rgba(76,214,118,0.7)`, transform: `scale(${0.6 + 0.4 * ai})`, opacity: ai }}>AI</span>
          <Woerter f={f} start={B1 + 38} text="in 2026." style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 56, lineHeight: "68px" }} />
        </div>
      </div>
    </div>
  );
};

// ---------- Headline, beat 2: the comparison ----------
const B2 = B1_AUS + 10;

// Small $1 bills drop onto a pile
const BILL_W = 220;
const Mini: React.FC<{ x: number; y: number; o: number }> = ({ x, y, o }) => (
  <g transform={`translate(${x} ${y})`} opacity={o}>
    <polygon points={`0,0 ${BILL_W},0 ${BILL_W + 44},-40 44,-40`} fill="#9FD9AE" stroke="#3A7A4E" strokeWidth={2} />
    <polygon points={`14,-5 ${BILL_W - 4},-5 ${BILL_W + 30},-35 48,-35`} fill="none" stroke="#3A7A4E" strokeWidth={1.2} opacity={0.8} />
    <ellipse cx={BILL_W / 2 + 22} cy={-20} rx={30} ry={11} fill="none" stroke="#3A7A4E" strokeWidth={1.5} />
    <polygon points={`0,0 ${BILL_W},0 ${BILL_W},6 0,6`} fill="#5E9C70" />
  </g>
);
const Scheinstapel: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  const n = 12;
  return (
    <svg width={960} height={260} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <ellipse cx={480 + 22} cy={238} rx={190} ry={18} fill={DS.primary} opacity={0.12 * clamp01(prog(f, start, 10))} />
      {Array.from({ length: n }, (_, i) => {
        const t0 = start + i * 3;
        if (f < t0) return null;
        const e = expoOut(prog(f, t0, 12));
        const dx = ((i * 37) % 13) - 6;
        return <Mini key={i} x={480 - BILL_W / 2 - 22 + dx} y={232 - i * 7 - (1 - e) * 260} o={clamp01(e * 2)} />;
      })}
    </svg>
  );
};

const Beat2: React.FC<{ f: number }> = ({ f }) => {
  if (f < B2) return null;
  const aus = expoOut(prog(f, HEADLINE_ENDE - 16, 14));
  const fuell = expoOut(prog(f, B2 + 26, 26));
  const gross: React.CSSProperties = { fontFamily: grotesk, fontWeight: 700, fontSize: 104, lineHeight: "112px", letterSpacing: "-0.035em" };
  const klein: React.CSSProperties = { fontFamily: inter, fontSize: 44, lineHeight: "56px", color: "#B4BDB8" };
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 250, textAlign: "center", opacity: 1 - aus, transform: `translateY(${-aus * 60}px)` }}>
      <Zeile f={f} start={B2}>
        <div style={klein}>Here is how that compares to</div>
      </Zeile>
      {/* alternate directions for the two big lines */}
      <div style={{ ...gross, marginTop: 14, color: DS.foreground, transform: `translateX(${(1 - expoOut(prog(f, B2 + 8, 18))) * -140}px)`, opacity: clamp01(prog(f, B2 + 8, 10)) }}>
        humanity’s biggest
      </div>
      <div style={{ position: "relative", ...gross, transform: `translateX(${(1 - expoOut(prog(f, B2 + 16, 18))) * 140}px)`, opacity: clamp01(prog(f, B2 + 16, 10)) }}>
        {/* outline first, then filled with light from the left */}
        <span style={{ color: "transparent", WebkitTextStroke: `2px ${DS.foreground}` }}>historical projects</span>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            color: DS.foreground,
            clipPath: `inset(0 ${(1 - fuell) * 100}% 0 0)`,
          }}
        >
          historical projects
        </span>
      </div>
      <Zeile f={f} start={B2 + 40} style={{ marginTop: 36 }}>
        <div style={klein}>if you stacked the cash in</div>
      </Zeile>
      <div style={{ ...gross, fontSize: 124, lineHeight: "136px", color: DS.primary, textShadow: "0 0 50px rgba(76,214,118,0.5)", marginTop: 6, transform: `scale(${1.3 - 0.3 * expoOut(prog(f, B2 + 50, 16))})`, opacity: clamp01(prog(f, B2 + 50, 8)) }}>
        $1 bills.
      </div>
      <div style={{ position: "relative", height: 260, marginTop: 10 }}>
        <Scheinstapel f={f} start={B2 + 58} />
      </div>
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
      {f >= INTRO_ENDE - 4 ? <Beat1 f={f} /> : null}
      <Beat2 f={f} />
    </AbsoluteFill>
  );
};
