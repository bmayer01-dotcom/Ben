// Endcard 1650–1800: Vier Projekte stapeln sich zu einer Säule, daneben Mag7 – gleicher linearer Maßstab.
import React from "react";
import { AbsoluteFill, spring } from "remotion";
import { PROJEKTE } from "./data.ts";
import { DS, grotesk, inter, mono, RAND } from "./design.ts";
import { formatMrd } from "./scale.ts";
import { clamp01, expoOut, prog, Woerter } from "./ui.tsx";
import { FPS, H } from "./world.ts";

const START = 1650;
const BASIS = 1000;
const PX_PRO_MRD = 500 / 780;
const BREITE = 140;
const SUMME_X = 560;
const MAG_X = 790;
const T3X = 14;
const T3Y = -8;

const kosten = (id: string) => PROJEKTE.find((p) => p.id === id)!;
// Von unten nach oben: der größte Block zuerst
const TEILE = ["apollo", "marshall", "iss", "manhattan"].map((id) => kosten(id));
const SUMME = TEILE.reduce((s, p) => s + p.kosten_mrd_usd, 0);
const MAG = kosten("mag7");
const KURZ: Record<string, string> = { apollo: "Apollo", marshall: "Marshallplan", iss: "ISS", manhattan: "Manhattan-Projekt" };

const Block: React.FC<{ x: number; y: number; h: number; front: string; seite: string; deckel: string }> = ({ x, y, h, front, seite, deckel }) => (
  <g>
    <polygon points={`${x + BREITE},${y} ${x + BREITE + T3X},${y + T3Y} ${x + BREITE + T3X},${y + h + T3Y} ${x + BREITE},${y + h}`} fill={seite} />
    <rect x={x} y={y} width={BREITE} height={h} fill={front} />
    <polygon points={`${x},${y} ${x + T3X},${y + T3Y} ${x + BREITE + T3X},${y + T3Y} ${x + BREITE},${y}`} fill={deckel} />
    <line x1={x} x2={x + BREITE} y1={y + h - 0.5} y2={y + h - 0.5} stroke={DS.background} strokeOpacity={0.5} strokeWidth={1} />
  </g>
);

export const Endcard: React.FC<{ f: number }> = ({ f }) => {
  const d = prog(f, START, 14);
  if (d <= 0) return null;
  const t = f - START;

  // Teilblöcke fallen nacheinander ein
  let yUnten = BASIS;
  const bloecke = TEILE.map((p, i) => {
    const h = p.kosten_mrd_usd * PX_PRO_MRD;
    const s = spring({ frame: t - 22 - i * 8, fps: FPS, config: { damping: 13, stiffness: 140 } });
    const ziel = yUnten - h;
    yUnten = ziel;
    return { p, h, y: ziel - (1 - s) * 520, sichtbar: t >= 22 + i * 8, s };
  });
  const summeTop = BASIS - SUMME * PX_PRO_MRD;
  const magH = MAG.kosten_mrd_usd * PX_PRO_MRD * expoOut(prog(t, 58, 26));
  const magTop = BASIS - magH;
  const linie = prog(t, 80, 12);

  return (
    <AbsoluteFill style={{ background: `rgba(6,10,8,${d})` }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: RAND, color: DS.foreground }}>
        <Woerter
          f={t}
          start={6}
          abstand={2}
          text="Mehr als Apollo, Manhattan-Projekt, Marshallplan und ISS zusammen – in einem Jahr."
          hervor={[9]}
          style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 58, lineHeight: "68px", letterSpacing: "-0.01em" }}
        />
      </div>
      <svg width={1080} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="endglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={DS.primary} stopOpacity="0.22" />
            <stop offset="1" stopColor={DS.primary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={MAG_X + BREITE / 2} cy={BASIS - 260} rx={300} ry={380} fill="url(#endglow)" opacity={clamp01(magH / 300)} />
        <line x1={60} x2={1020} y1={BASIS + 1} y2={BASIS + 1} stroke={DS.borderStrong} strokeWidth={2} opacity={clamp01(t / 10)} />
        {bloecke.map(({ p, h, y, sichtbar }) =>
          sichtbar ? <Block key={p.id} x={SUMME_X} y={y} h={h} front="#6F9375" seite="#4E6E55" deckel="#9CBBA1" /> : null,
        )}
        {magH > 0.5 ? <Block x={MAG_X} y={magTop} h={magH} front={DS.primary} seite={DS.primaryDeep} deckel="#A5F0BC" /> : null}
        {/* Gestrichelte Linie auf Höhe der Summe: Mag7 liegt darüber */}
        {linie > 0 ? (
          <line x1={SUMME_X} x2={SUMME_X + (MAG_X + BREITE + T3X - SUMME_X) * linie} y1={summeTop} y2={summeTop} stroke={DS.foreground} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="10 8" />
        ) : null}
      </svg>
      {/* Beschriftung der Teilblöcke */}
      {bloecke.map(({ p, h, y, s, sichtbar }) =>
        sichtbar ? (
          <div key={p.id} style={{ position: "absolute", right: 1080 - SUMME_X + 24, top: y + h / 2 - 22, opacity: clamp01(s * 1.5), display: "flex", gap: 14, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 36, color: DS.foreground }}>{KURZ[p.id]}</span>
            <span style={{ fontFamily: mono, fontSize: 36, color: DS.muted }}>{p.kosten_mrd_usd}</span>
          </div>
        ) : null,
      )}
      <div style={{ position: "absolute", left: SUMME_X - 40, width: BREITE + 80, top: summeTop - 66, textAlign: "center", fontFamily: grotesk, fontWeight: 600, fontSize: 44, color: DS.foreground, opacity: prog(t, 54, 8) }}>
        {formatMrd(SUMME)}
      </div>
      <div style={{ position: "absolute", left: MAG_X - 60, width: BREITE + 120, top: magTop - 66, textAlign: "center", fontFamily: grotesk, fontWeight: 700, fontSize: 44, color: DS.primary, opacity: prog(t, 74, 8), textShadow: "0 0 30px rgba(76,214,118,0.4)" }}>
        {formatMrd(MAG.kosten_mrd_usd)}
      </div>
      <div style={{ position: "absolute", left: SUMME_X - 80, width: BREITE + 160, top: BASIS + 18, textAlign: "center", fontFamily: mono, fontSize: 36, color: DS.muted, opacity: prog(t, 30, 10) }}>
        4 Projekte
      </div>
      <div style={{ position: "absolute", left: MAG_X - 80, width: BREITE + 160, top: BASIS + 18, textAlign: "center", fontFamily: mono, fontSize: 36, color: DS.primary, opacity: prog(t, 64, 10) }}>
        1 Jahr
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: RAND, textAlign: "center", color: DS.muted, fontFamily: inter, fontSize: 36, lineHeight: "46px", opacity: prog(t, 92, 12) }}>
        Höhe maßstabsgetreu, Breite nicht. Projektkosten inflationsbereinigt (USD); Stuttgart 21 und Burj Khalifa nominal. Mag7: Capex-Guidance Q2/2026 inkl. Nicht-KI-Anteilen. Scheindicke 0,1092 mm.
      </div>
    </AbsoluteFill>
  );
};
