import React from "react";
import { AbsoluteFill, Html5Audio, spring, staticFile, useCurrentFrame } from "remotion";
import { PROJEKTE } from "./data.ts";
import { DS, grotesk, inter, mono } from "./design.ts";
import { Crawl } from "./crawl.tsx";
import { ProjektIcon } from "./icons.tsx";
import { Intro } from "./intro.tsx";
import { formatHoehe, formatMrd } from "./scale.ts";
import { clamp01, expoOut, Eyebrow, Glas, prog, Woerter, Zeile } from "./ui.tsx";
import {
  aktiveSzene,
  BASIS_Y,
  camera,
  CRAWL_START,
  erdeBild,
  FINALE_ENDE,
  FINALE_START,
  FPS,
  H,
  HEADLINE_ENDE,
  HOEHEN_KM,
  hoeheBeiY,
  N,
  stapelHoeheKm,
  stapelRect,
  SZENEN,
  W,
  ZOOM_ENDE,
} from "./world.ts";
import type { Kamera, StapelRect } from "./world.ts";

const fade = (f: number, a: number, b: number) => prog(f, a, b - a);

// ---------- Sky: colour by the altitude of each screen row ----------
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(t))).join(",")})`;
};
const HIMMEL_BODEN = "#DDF3E6";
const HIMMEL_MITTE = "#0E2A22";
const himmelFarbe = (alt: number) => {
  if (alt <= 1) return mix(HIMMEL_BODEN, HIMMEL_BODEN, 0);
  if (alt <= 100) return mix(HIMMEL_BODEN, HIMMEL_MITTE, Math.log10(alt) / 2);
  if (alt <= 400) return mix(HIMMEL_MITTE, DS.background, Math.log10(alt / 100) / Math.log10(4));
  return DS.background;
};
const HIMMEL_HOEHEN = [0, 1, 2, 5, 10, 20, 50, 100, 200, 400];
const Himmel: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const yBei = (alt: number) => BASIS_Y - alt / cam.k;
  const stops = [
    { y: 0, c: himmelFarbe(hoeheBeiY(cam, 0)) },
    ...HIMMEL_HOEHEN.map((alt) => ({ y: yBei(alt), c: himmelFarbe(alt) })).filter((p) => p.y > 0 && p.y < H),
    { y: H, c: himmelFarbe(Math.max(hoeheBeiY(cam, H), 0)) },
  ].sort((a, b) => a.y - b.y);
  return <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${stops.map((p) => `${p.c} ${((p.y / H) * 100).toFixed(3)}%`).join(",")})` }} />;
};

const zufall = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Stars drift with log(camera altitude); fast climbs pull them into streaks.
const sternSicht = (alt: number) => clamp01(Math.log10(Math.max(alt, 1) / 100) / Math.log10(4));
const STERNE = (() => {
  const r = zufall(7);
  return Array.from({ length: 56 }, () => ({ x: r() * W, y: r() * H, r: 1.1 + r() * 1.7, a: 0.35 + r() * 0.6, tiefe: 0.35 + r() * 0.65 }));
})();
const parallaxe = (cam: Kamera) => Math.log10(hoeheBeiY(cam, H / 2) + 1) * 520;
const Sterne: React.FC<{ cam: Kamera; vorher: Kamera }> = ({ cam, vorher }) => {
  const p = parallaxe(cam);
  const dp = p - parallaxe(vorher);
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      {STERNE.map((s, i) => {
        const y = (((s.y + p * s.tiefe) % H) + H) % H;
        const o = sternSicht(hoeheBeiY(cam, y)) * s.a;
        if (o <= 0.01) return null;
        const zug = Math.min(Math.abs(dp) * s.tiefe * 0.7, 90);
        return zug > 2 ? (
          <line key={i} x1={s.x} x2={s.x} y1={y} y2={y - Math.sign(dp) * zug} stroke={i % 7 === 0 ? DS.primary : DS.foreground} strokeWidth={s.r * 1.3} strokeLinecap="round" opacity={o * 0.85} />
        ) : (
          <circle key={i} cx={s.x} cy={y} r={s.r} fill={DS.foreground} opacity={o} />
        );
      })}
    </svg>
  );
};

// ---------- Clouds around the Burj stack (true scale) ----------
const WOLKEN = (() => {
  const r = zufall(100);
  return Array.from({ length: 10 }, (_, n) => ({ dx: (r() - 0.5) * 30, alt: 7 + r() * 4, w: 2.5 + r() * 4, h: 0.6 + r() * 0.6, vorne: n % 3 === 0 }));
})();
const Wolken: React.FC<{ cam: Kamera; vorne: boolean }> = ({ cam, vorne }) => (
  <g>
    {WOLKEN.filter((w) => w.vorne === vorne).map((w, i) => {
      const x = cam.stapelX[0] + w.dx / cam.k;
      const y = BASIS_Y - w.alt / cam.k;
      const rx = w.w / 2 / cam.k;
      const ry = w.h / 2 / cam.k;
      if (rx < 2 || x + rx < -50 || x - rx > W + 50 || y + ry < -50 || y - ry > H + 50) return null;
      return (
        <g key={i} fill="#FFFFFF" opacity={0.92 * clamp01((rx - 2) / 6)}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} />
          <ellipse cx={x - rx * 0.4} cy={y - ry * 0.5} rx={rx * 0.45} ry={ry * 0.8} />
          <ellipse cx={x + rx * 0.25} cy={y - ry * 0.6} rx={rx * 0.4} ry={ry * 0.9} />
        </g>
      );
    })}
  </g>
);

// ---------- The real Burj Khalifa beside its stack (828 m, true height) ----------
const TURM_VERSATZ = 200; // px left of the stack
// half width and height in metres
const BURJ_PROFIL: [number, number][] = [
  [45, 0], [45, 160], [36, 160], [36, 310], [28, 310], [28, 440], [20, 440],
  [20, 560], [13, 560], [13, 640], [7, 640], [7, 700], [3, 700], [0.8, 828],
];
const turmX = (cam: Kamera) => cam.stapelX[0] - TURM_VERSATZ;
const Turm: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const hoehePx = 0.828 / cam.k;
  if (hoehePx < 1) return null;
  const x0 = turmX(cam);
  const pkt = (b: number, h: number) => `${x0 + b / 1000 / cam.k},${BASIS_Y - h / 1000 / cam.k}`;
  const pts = [...BURJ_PROFIL.map(([b, h]) => pkt(b, h)), ...[...BURJ_PROFIL].reverse().map(([b, h]) => pkt(-b, h))];
  return (
    <g>
      <defs>
        <linearGradient id="turm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9C9BA" />
          <stop offset="1" stopColor="#5F7E72" />
        </linearGradient>
      </defs>
      <polygon points={pts.join(" ")} fill="url(#turm)" />
    </g>
  );
};

// ---------- Stacks: light 3D, front height exactly to scale ----------
const TIEFE3D_X = 12;
const TIEFE3D_Y = -7;
const GRUEN_3D = { hell: "#8CD19E", dunkel: "#4C9A63", seite: "#3A7A4E", deckel: "#C2EFCD" };
const MINT_3D = { hell: "#7DF2A2", dunkel: "#3FD06D", seite: "#00b666", deckel: "#B8F7CB" };
const Verlaeufe: React.FC = () => (
  <>
    {([["front-gruen", GRUEN_3D], ["front-mint", MINT_3D]] as const).map(([id, t]) => (
      <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={t.hell} />
        <stop offset="1" stopColor={t.dunkel} />
      </linearGradient>
    ))}
    <filter id="weich" x="-50%" y="-200%" width="200%" height="500%">
      <feGaussianBlur stdDeviation="8" />
    </filter>
    <filter id="bloom" x="-200%" y="-5%" width="500%" height="110%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
    <radialGradient id="erde-licht" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0" stopColor="#8DB8FF" />
      <stop offset="0.55" stopColor="#3D7BE6" />
      <stop offset="1" stopColor="#1C46B0" />
    </radialGradient>
    <linearGradient id="horizont" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stopColor={DS.primary} stopOpacity="0.16" />
      <stop offset="1" stopColor={DS.primary} stopOpacity="0" />
    </linearGradient>
  </>
);

const Stapel: React.FC<{ r: StapelRect; mag: boolean; licht: number }> = ({ r, mag, licht }) => {
  const oben = Math.max(r.spitze, -20);
  const unten = Math.min(r.basis, H + 20);
  if (unten <= oben || r.hoehePx <= 0) return null;
  const x0 = r.x - r.breite / 2;
  const x1 = x0 + r.breite;
  const ton = mag ? MINT_3D : GRUEN_3D;
  return (
    <g>
      {mag ? <rect x={x0 - 12} y={oben} width={r.breite + 36} height={unten - oben} fill={DS.primary} opacity={0.32} filter="url(#bloom)" /> : null}
      <polygon points={`${x1},${oben} ${x1 + TIEFE3D_X},${oben + TIEFE3D_Y} ${x1 + TIEFE3D_X},${unten + TIEFE3D_Y} ${x1},${unten}`} fill={ton.seite} />
      <rect x={x0} y={oben} width={r.breite} height={unten - oben} fill={`url(#${mag ? "front-mint" : "front-gruen"})`} />
      <polygon points={`${x0},${r.spitze} ${x0 + TIEFE3D_X},${r.spitze + TIEFE3D_Y} ${x1 + TIEFE3D_X},${r.spitze + TIEFE3D_Y} ${x1},${r.spitze}`} fill={ton.deckel} />
      {licht > 0 ? (
        <g opacity={licht}>
          <ellipse cx={x0 + r.breite / 2 + TIEFE3D_X / 2} cy={r.spitze + TIEFE3D_Y / 2} rx={64} ry={16} fill={mag ? DS.primary : "#FFFFFF"} opacity={0.6} filter="url(#weich)" />
          <line x1={x0} x2={x1 + TIEFE3D_X} y1={r.spitze + TIEFE3D_Y / 2} y2={r.spitze + TIEFE3D_Y / 2} stroke="#FFFFFF" strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};

const Aufprall: React.FC<{ f: number; r: StapelRect; landung: number; mag: boolean }> = ({ f, r, landung, mag }) => {
  const t = prog(f, landung + 3, 18);
  if (t <= 0 || t >= 1) return null;
  const rx = 34 + 120 * expoOut(t);
  return <ellipse cx={r.x + TIEFE3D_X / 2} cy={r.spitze + TIEFE3D_Y / 2} rx={rx} ry={rx * 0.3} fill="none" stroke={mag ? DS.primary : DS.foreground} strokeWidth={3 * (1 - t) + 0.5} opacity={1 - t} />;
};

// Only the newest stack carries its icon; it fades when the next one starts.
const iconDeckung = (f: number, i: number) => {
  const ende = i + 1 < N ? SZENEN[i + 1].start : FINALE_START;
  return fade(f, SZENEN[i].wachsEnde, SZENEN[i].wachsEnde + 3) * (1 - fade(f, ende, ende + 8));
};

// ---------- Earth (finale) ----------
const Erde: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const e = erdeBild(cam);
  if (!e || e.x + e.r < 0) return null;
  return <circle cx={e.x} cy={e.y} r={e.r} fill="url(#erde-licht)" />;
};
const ErdeLabel: React.FC<{ cam: Kamera; f: number }> = ({ cam, f }) => {
  const e = erdeBild(cam);
  if (!e) return null;
  return (
    <div style={{ position: "absolute", left: e.x - 100, width: 200, top: e.y - e.r - 54, textAlign: "center", fontFamily: grotesk, fontSize: 36, fontWeight: 600, color: DS.foreground, opacity: fade(f, ZOOM_ENDE - 20, ZOOM_ENDE) }}>
      Earth
    </div>
  );
};

// ---------- Project card (fixed at the top) ----------
const KARTE_OBEN = 72;
const karteStart = (i: number) => SZENEN[i].wachsEnde + 6;
const karteEnde = (i: number) => (i + 1 < N ? SZENEN[i + 1].wachsEnde : FINALE_START);

const Karte: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const p = PROJEKTE[i];
  const mag = p.id === "mag7";
  const t0 = karteStart(i);
  const aus = prog(f, karteEnde(i), 8);
  const zahl = expoOut(prog(f, t0 + 6, 22));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: KARTE_OBEN, opacity: 1 - aus, transform: `translateY(${aus * -16}px)` }}>
      <Glas akzent={mag} wipe={expoOut(prog(f, t0, 14))} innen={{ padding: "22px 30px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Woerter f={f} start={t0 + 4} text={p.name} style={{ fontFamily: grotesk, fontSize: 52, fontWeight: 600, lineHeight: "60px", letterSpacing: "-0.01em", color: mag ? DS.primary : DS.foreground }} />
          <Zeile f={f} start={t0 + 6}>
            <Eyebrow akzent={mag} text={`${String(i + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`} />
          </Zeile>
        </div>
        <Zeile f={f} start={t0 + 8} style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: grotesk, fontSize: 46, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            <span>{formatMrd(Math.round(p.kosten_mrd_usd * zahl * 10) / 10)}</span>
            <span style={{ width: 2, height: 34, background: DS.borderStrong }} />
            <span>{formatHoehe(HOEHEN_KM[i] * zahl)}</span>
          </div>
        </Zeile>
        <Zeile f={f} start={t0 + 12} style={{ marginTop: 8 }}>
          <div style={{ fontFamily: inter, fontSize: 36, lineHeight: "44px", color: "#B4BDB8" }}>{p.kontextzeile}</div>
        </Zeile>
      </Glas>
    </div>
  );
};

// ---------- Burj scene: label on the real tower ----------
const TurmLabel: React.FC<{ f: number; cam: Kamera }> = ({ f, cam }) => {
  const s = SZENEN[0];
  const d = fade(f, s.start + 6, s.start + 14) * (1 - fade(f, s.wachsStart + 30, s.wachsStart + 38));
  if (d <= 0) return null;
  const turmOben = BASIS_Y - 0.828 / cam.k;
  return (
    <div style={{ position: "absolute", right: W - (turmX(cam) - 60), top: Math.max(turmOben - 10, 420), opacity: d, textAlign: "right" }}>
      <Glas innen={{ padding: "8px 16px", lineHeight: "42px" }}>
        <div style={{ fontFamily: grotesk, fontSize: 36, fontWeight: 600 }}>Burj Khalifa</div>
        <div style={{ fontFamily: mono, fontSize: 36, color: DS.muted }}>828 m</div>
      </Glas>
    </div>
  );
};

// ---------- Counter bottom right: height, during the zoom-out the scale ----------
const Zaehler: React.FC<{ f: number; cam: Kamera }> = ({ f, cam }) => {
  let label = "Height";
  let wert = "";
  let d = 0;
  if (f >= FINALE_START) {
    label = "Scale";
    wert = `1 px = ${formatHoehe(cam.k)}`;
    d = fade(f, FINALE_START + 4, FINALE_START + 12) * (1 - fade(f, ZOOM_ENDE + 6, ZOOM_ENDE + 14));
  } else {
    const i = aktiveSzene(f);
    if (i < 0) return null;
    const s = SZENEN[i];
    if (f < s.wachsStart) {
      if (i === 0) return null;
      wert = formatHoehe(HOEHEN_KM[i - 1]);
      d = 1 - fade(f, s.start, s.start + 6);
    } else {
      wert = formatHoehe(stapelHoeheKm(f, i));
      d = fade(f, s.wachsStart, s.wachsStart + 4);
    }
  }
  if (d <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 28, top: 1200, opacity: d }}>
      <Glas innen={{ padding: "8px 18px", display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: mono, fontSize: 36, color: DS.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontFamily: grotesk, fontSize: 48, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{wert}</span>
      </Glas>
    </div>
  );
};

// ---------- Progress at the top ----------
const Fortschritt: React.FC<{ f: number }> = ({ f }) => {
  const a = SZENEN[0].start;
  const b = FINALE_START;
  const d = fade(f, a + 6, a + 16) * (1 - fade(f, b, b + 10));
  if (d <= 0) return null;
  const x = (fr: number) => 60 + ((fr - a) / (b - a)) * (W - 120);
  const jetzt = x(Math.min(Math.max(f, a), b));
  const magStart = x(SZENEN[N - 1].start);
  return (
    <svg width={W} height={60} style={{ position: "absolute", top: 12, opacity: d }}>
      <line x1={60} x2={W - 60} y1={22} y2={22} stroke={DS.background} strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round" />
      <line x1={60} x2={W - 60} y1={22} y2={22} stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" />
      <line x1={60} x2={Math.min(jetzt, magStart)} y1={22} y2={22} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      {jetzt > magStart ? <line x1={magStart} x2={jetzt} y1={22} y2={22} stroke={DS.primary} strokeWidth={3} strokeLinecap="round" /> : null}
      {SZENEN.map((s, i) => {
        const aktiv = f >= s.start;
        const mag = i === N - 1;
        return <circle key={s.id} cx={x(s.start)} cy={22} r={aktiv ? 6 : 4.5} fill={aktiv ? (mag ? DS.primary : "#FFFFFF") : DS.background} stroke={mag ? DS.primary : "#FFFFFF"} strokeOpacity={0.85} strokeWidth={2} />;
      })}
    </svg>
  );
};

// ---------- Finale ----------
const LABEL_OBEN = 64;
const LABEL_ZEILE = 84;
const LABEL_H = 80;
const labelStart = (zeile: number) => ZOOM_ENDE - 12 + zeile * 4;

const FinaleLabels: React.FC<{ f: number; rects: StapelRect[] }> = ({ f, rects }) => (
  <>
    <svg width={W} height={H} style={{ position: "absolute" }}>
      {rects.map((r, i) => {
        const zeile = N - 1 - i;
        const t0 = labelStart(zeile);
        if (f < t0) return null;
        const farbe = PROJEKTE[i].id === "mag7" ? DS.primary : DS.foreground;
        const x = r.x + TIEFE3D_X / 2;
        const y0 = LABEL_OBEN + zeile * LABEL_ZEILE + LABEL_H + 6;
        const y1 = r.spitze + TIEFE3D_Y - 8;
        const zug = expoOut(prog(f, t0 + 4, 16));
        const punkt = spring({ frame: f - t0 - 14, fps: FPS, config: { damping: 9, stiffness: 200 } });
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * zug} stroke={farbe} strokeWidth={2} strokeOpacity={0.75} />
            <circle cx={x} cy={y1} r={4.5 * punkt} fill={farbe} />
            <circle cx={x} cy={y1} r={4 + 14 * expoOut(prog(f, t0 + 14, 14))} fill="none" stroke={farbe} strokeOpacity={0.6 * (1 - prog(f, t0 + 14, 14))} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
    {rects.map((r, i) => {
      const zeile = N - 1 - i;
      const t0 = labelStart(zeile);
      if (f < t0) return null;
      const mag = PROJEKTE[i].id === "mag7";
      const e = expoOut(prog(f, t0, 14));
      return (
        <div key={i} style={{ position: "absolute", right: W - (r.x + 30), top: LABEL_OBEN + zeile * LABEL_ZEILE, opacity: e, transform: `translateX(${(1 - e) * -24}px)`, textAlign: "right", fontSize: 36, lineHeight: "40px", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: grotesk, fontWeight: 600, color: mag ? DS.primary : DS.foreground, textShadow: mag ? "0 0 24px rgba(76,214,118,0.5)" : undefined }}>{PROJEKTE[i].name}</div>
          <div style={{ fontFamily: inter, color: mag ? DS.primary : DS.muted }}>{formatMrd(PROJEKTE[i].kosten_mrd_usd)}</div>
        </div>
      );
    })}
  </>
);

const BURJ_ANZAHL = Math.floor(PROJEKTE[N - 1].kosten_mrd_usd / PROJEKTE[0].kosten_mrd_usd);
const TITEL_START = ZOOM_ENDE + 14;
const BURJ_START = ZOOM_ENDE + 80;

const FinaleTexte: React.FC<{ f: number; burj: StapelRect }> = ({ f, burj }) => {
  const ring = expoOut(prog(f, BURJ_START - 4, 20));
  const umfang = 2 * Math.PI * 38;
  const cx = burj.x + TIEFE3D_X / 2;
  const cy = burj.spitze + TIEFE3D_Y / 2;
  const puls = prog(f, BURJ_START + 18, 24);
  const zahl = Math.round(BURJ_ANZAHL * expoOut(prog(f, BURJ_START + 2, 30)));
  const zeile: React.CSSProperties = { position: "absolute", left: 40, right: 40, top: 1228, textAlign: "center", color: DS.foreground, fontSize: 42, lineHeight: "50px" };
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {ring > 0 ? (
          <>
            <circle cx={cx} cy={cy} r={38} fill="none" stroke={DS.foreground} strokeWidth={4} strokeDasharray={umfang} strokeDashoffset={umfang * (1 - ring)} transform={`rotate(-90 ${cx} ${cy})`} />
            {puls > 0 && puls < 1 ? <circle cx={cx} cy={cy} r={38 + 40 * expoOut(puls)} fill="none" stroke={DS.foreground} strokeWidth={2} opacity={1 - puls} /> : null}
          </>
        ) : null}
      </svg>
      <div style={{ ...zeile, opacity: 1 - fade(f, BURJ_START - 12, BURJ_START - 4) }}>
        <Woerter f={f} start={TITEL_START} text="All stacks to scale" style={{ fontFamily: grotesk, fontWeight: 600 }} />
      </div>
      {f >= BURJ_START ? (
        <div style={{ ...zeile, fontFamily: inter }}>
          <Zeile f={f} start={BURJ_START}>
            AI capex could build{" "}
            <b style={{ fontFamily: grotesk, fontWeight: 700, color: DS.primary, fontVariantNumeric: "tabular-nums" }}>{zahl} Burj Khalifas.</b>
          </Zeile>
        </div>
      ) : null}
    </>
  );
};

// ---------- Composition ----------
export const DollarStapel: React.FC = () => {
  const f = useCurrentFrame();
  const welt = f >= HEADLINE_ENDE - 10 && f < CRAWL_START + 20;
  const cam = camera(Math.min(f, FINALE_ENDE - 1));
  const vorher = camera(Math.min(Math.max(f - 1, 0), FINALE_ENDE - 1));
  const rects = PROJEKTE.map((_, i) => stapelRect(cam, i, stapelHoeheKm(f, i)));
  const imAll = clamp01(Math.log10(Math.max(hoeheBeiY(cam, H / 2), 1)) / 2);

  return (
    <AbsoluteFill style={{ fontFamily: inter, backgroundColor: DS.background, color: DS.foreground }}>
      <Html5Audio src={staticFile("musik.wav")} />
      {welt ? (
        <>
          <Himmel cam={cam} />
          <Sterne cam={cam} vorher={vorher} />
          <svg width={W} height={H} style={{ position: "absolute" }}>
            <defs>
              <Verlaeufe />
            </defs>
            <rect x={0} y={BASIS_Y - 180} width={W} height={180} fill="url(#horizont)" opacity={imAll} />
            <rect x={0} y={BASIS_Y} width={W} height={H - BASIS_Y} fill={DS.card} />
            <line x1={0} x2={W} y1={BASIS_Y} y2={BASIS_Y} stroke={DS.borderStrong} strokeWidth={2} />
            <Wolken cam={cam} vorne={false} />
            <Erde cam={cam} />
            <Turm cam={cam} />
            {rects.map((r, i) => {
              const s = SZENEN[i];
              const licht = fade(f, s.wachsStart, s.wachsStart + 4) * (1 - fade(f, s.wachsEnde - 2, s.wachsEnde + 8));
              return <Stapel key={i} r={r} mag={PROJEKTE[i].id === "mag7"} licht={licht} />;
            })}
            {rects.map((r, i) => (
              <Aufprall key={i} f={f} r={r} landung={SZENEN[i].wachsEnde} mag={PROJEKTE[i].id === "mag7"} />
            ))}
            {rects.map((r, i) => {
              const d = iconDeckung(f, i);
              if (d <= 0) return null;
              const s = spring({ frame: f - SZENEN[i].wachsEnde, fps: FPS, config: { damping: 8, stiffness: 170, mass: 0.6 } });
              return (
                <g key={i} transform={`translate(${r.x + TIEFE3D_X / 2 - 60} ${r.spitze + TIEFE3D_Y / 2 - 122 - (1 - s) * 90})`} opacity={d}>
                  <ProjektIcon id={PROJEKTE[i].id} />
                </g>
              );
            })}
            <Wolken cam={cam} vorne />
          </svg>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.32) 100%)", opacity: imAll }} />
          <ErdeLabel cam={cam} f={f} />
          <TurmLabel f={f} cam={cam} />
          {PROJEKTE.map((_, i) => (f >= karteStart(i) && f < karteEnde(i) + 8 ? <Karte key={i} i={i} f={f} /> : null))}
          <Zaehler f={f} cam={cam} />
          <Fortschritt f={f} />
          {f >= ZOOM_ENDE - 12 ? <FinaleLabels f={f} rects={rects} /> : null}
          {f >= TITEL_START ? <FinaleTexte f={f} burj={rects[0]} /> : null}
        </>
      ) : null}
      <Crawl f={f} />
      <Intro f={f} />
    </AbsoluteFill>
  );
};
