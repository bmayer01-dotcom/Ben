// Hook 0–105: kinetische Typo, dann fallen Scheine und türmen sich auf. Endet mit einem Zoom in die Papierkante.
import React from "react";
import { AbsoluteFill } from "remotion";
import { DS, grotesk, inter, mono, RAND } from "./design.ts";
import { SCHEIN_W, ScheinOben, TIEFE_X, TIEFE_Y } from "./schein.tsx";
import { clamp01, expoOut, prog, Woerter } from "./ui.tsx";
import { H, HOOK_ENDE, HOOK_LANDUNGEN, W } from "./world.ts";

const X0 = 202; // vordere linke Ecke des Stapels
const BASIS = 1180;
const PX_PRO_SCHEIN = 0.42; // 600 px ≙ 156 mm
const AUS_START = HOOK_ENDE - 9;

const zufall = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const ABWUERFE = (() => {
  const r = zufall(42);
  const n = HOOK_LANDUNGEN.length;
  return HOOK_LANDUNGEN.map((landung, j) => ({
    landung,
    anzahl: Math.round(Math.pow(1000, j / (n - 1))),
    dx: j === 0 ? 0 : (r() - 0.5) * 36,
    dreh: (r() - 0.5) * 6,
  }));
})();
const STREIFEN = (() => {
  const r = zufall(9);
  return Array.from({ length: 160 }, () => ({ dx: (r() - 0.5) * 7, ton: r() }));
})();
const nf = new Intl.NumberFormat("de-DE");
const mischen = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

export const Hook: React.FC<{ f: number }> = ({ f }) => {
  const aus = prog(f, AUS_START, 12);
  if (aus >= 1) return null;

  let anzahl = 0;
  ABWUERFE.forEach((a, j) => {
    if (f < a.landung) return;
    const vorher = j === 0 ? 0 : ABWUERFE[j - 1].anzahl;
    anzahl = vorher + (a.anzahl - vorher) * expoOut(prog(f, a.landung, 5));
  });
  const hPx = anzahl * PX_PRO_SCHEIN;
  const yOben = BASIS - hPx;
  const gelandet = ABWUERFE.filter((a) => f >= a.landung);
  const oberster = gelandet[gelandet.length - 1];
  const letzteLandung = oberster ? f - oberster.landung : 99;

  const zahl = Math.round(780 * expoOut(prog(f, 4, 30)));
  const zoom = 1 + Math.pow(aus, 2) * 9;
  const glow = clamp01(anzahl / 1000);

  return (
    <AbsoluteFill style={{ background: DS.background, opacity: 1 - clamp01((aus - 0.5) * 2) }}>
      {/* Punktraster, radial ausgeblendet */}
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id="raster" width={36} height={36} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${-f * 0.4})`}>
            <circle cx={18} cy={18} r={1.3} fill={DS.foreground} />
          </pattern>
          <radialGradient id="rastermaske" cx="0.5" cy="0.55" r="0.65">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="rm">
            <rect width={W} height={H} fill="url(#rastermaske)" />
          </mask>
          <radialGradient id="mintglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={DS.primary} stopOpacity="0.28" />
            <stop offset="1" stopColor={DS.primary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#raster)" mask="url(#rm)" />
      </svg>

      {/* Zoom in die Papierkante */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${X0 + SCHEIN_W / 2}px ${BASIS - hPx * 0.4}px`, filter: aus > 0 ? `blur(${aus * 6}px)` : undefined }}>
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <ellipse cx={X0 + SCHEIN_W / 2 + 40} cy={BASIS - 160} rx={560} ry={420} fill="url(#mintglow)" opacity={0.35 + 0.65 * glow} />
          <ellipse cx={X0 + SCHEIN_W / 2 + 30} cy={BASIS + 6} rx={400} ry={26} fill="#000" opacity={0.55} />
          <line x1={60} x2={W - 60} y1={BASIS + 1} y2={BASIS + 1} stroke={DS.border} strokeWidth={2} />
          {hPx > 0 ? (
            <g>
              <polygon
                points={`${X0 + SCHEIN_W},${yOben} ${X0 + SCHEIN_W + TIEFE_X},${yOben + TIEFE_Y} ${X0 + SCHEIN_W + TIEFE_X},${BASIS + TIEFE_Y} ${X0 + SCHEIN_W},${BASIS}`}
                fill="#8E9A87"
              />
              {STREIFEN.map((s, i) => {
                const y = BASIS - i * 3;
                if (y <= yOben + 0.5) return null;
                return <rect key={i} x={X0 + s.dx} y={Math.max(y - 3, yOben)} width={SCHEIN_W} height={Math.min(3, y - yOben)} fill={mischen([190, 202, 182], [217, 225, 207], s.ton)} />;
              })}
              {STREIFEN.map((s, i) => {
                const y = BASIS - i * 3;
                return i % 2 === 0 && y > yOben ? <line key={`l${i}`} x1={X0 + s.dx} x2={X0 + s.dx + SCHEIN_W} y1={y} y2={y} stroke="#87957F" strokeWidth={0.8} /> : null;
              })}
              {/* Licht von links oben auf der Vorderkante */}
              <rect x={X0} y={yOben} width={SCHEIN_W} height={hPx} fill="url(#kantenlicht)" />
              <defs>
                <linearGradient id="kantenlicht" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
                  <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
                  <stop offset="1" stopColor="#000" stopOpacity="0.18" />
                </linearGradient>
              </defs>
            </g>
          ) : null}
          {oberster ? <ScheinOben id="oben" fontFamily={grotesk} x0={X0 + oberster.dx * 0.3} y0={yOben} drehung={oberster.dreh * 0.3} /> : null}
          {/* Aufsetz-Blitz */}
          {oberster && letzteLandung < 8 ? (
            <line x1={X0 + 20} x2={X0 + SCHEIN_W - 20} y1={yOben} y2={yOben} stroke={DS.primary} strokeWidth={3} opacity={1 - letzteLandung / 8} style={{ filter: "blur(2px)" }} />
          ) : null}
          {ABWUERFE.map((a, j) => {
            const dauer = j === 0 ? 22 : 8;
            const t = (f - (a.landung - dauer)) / dauer;
            if (t < 0 || t >= 1) return null;
            const yZiel = BASIS - (j === 0 ? 0 : ABWUERFE[j - 1].anzahl * PX_PRO_SCHEIN);
            const yStart = j === 0 ? 660 : 700;
            const y = yStart + (yZiel - yStart) * t * t;
            const tempo = (2 * t * (yZiel - yStart)) / dauer;
            return (
              <g key={j} style={{ filter: `blur(${Math.min(tempo * 0.12, 8)}px)` }}>
                <ScheinOben id={`flug${j}`} fontFamily={grotesk} x0={X0 + a.dx} y0={y} drehung={a.dreh * (1 + 1.5 * (1 - t))} deckung={j === 0 ? clamp01(t * 3) : clamp01(t * 4)} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Typo */}
      <div style={{ position: "absolute", left: 60, right: 60, top: RAND, opacity: 1 - aus }}>
        <div style={{ fontFamily: mono, fontSize: 36, letterSpacing: "0.08em", color: DS.muted, opacity: clamp01(f / 8), transform: `translateY(${(1 - expoOut(prog(f, 0, 14))) * 20}px)` }}>
          MAG7 · CAPEX 2026
        </div>
        <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 150, lineHeight: "160px", letterSpacing: "-0.035em", color: DS.primary, textShadow: "0 0 50px rgba(76,214,118,0.35)", fontVariantNumeric: "tabular-nums", marginTop: 8 }}>
          {zahl} Mrd.&nbsp;$
        </div>
        <Woerter f={f} start={20} abstand={2} text="– so viel investieren die Mag7 2026 in KI." style={{ fontFamily: grotesk, fontWeight: 600, fontSize: 52, lineHeight: "62px", marginTop: 6 }} />
        <Woerter f={f} start={44} abstand={2} text="Wie hoch ist das als Stapel aus 1‑Dollar‑Scheinen?" style={{ fontFamily: inter, fontSize: 40, lineHeight: "50px", color: DS.muted, marginTop: 22 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: BASIS + 22, textAlign: "center", fontFamily: mono, fontSize: 36, color: DS.muted, opacity: clamp01((f - 30) / 6) * (1 - aus), fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: DS.foreground }}>{nf.format(Math.round(anzahl))}</span> × 1 $
      </div>
    </AbsoluteFill>
  );
};
