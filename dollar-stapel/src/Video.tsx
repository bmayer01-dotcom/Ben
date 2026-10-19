import React from "react";
import { AbsoluteFill, Html5Audio, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { PROJEKTE } from "./data.ts";
import { DS, grotesk, inter, mono, RAND } from "./design.ts";
import { Endcard } from "./endcard.tsx";
import { Hook } from "./hook.tsx";
import { ProjektIcon } from "./icons.tsx";
import { formatHoehe, formatKm, formatMrd, scheineKm } from "./scale.ts";
import { clamp01, expoOut, Eyebrow, Glas, prog, Woerter, Zeile } from "./ui.tsx";
import {
  aktiveSzene,
  BURJ_TURM_X_KM,
  camera,
  erdeBild,
  FINALE_ENDE,
  FINALE_START,
  FPS,
  H,
  HOCHHAUS_X_KM,
  HOEHEN_KM,
  KAL_LANDUNGEN,
  KAL_X_KM,
  kalScheine,
  markerLayout,
  stapelHoeheKm,
  stapelRect,
  stapelXKm,
  SZENEN,
  W,
  wachsEnde,
  wachsStart,
  zuBild,
} from "./world.ts";
import type { Kamera, StapelRect } from "./world.ts";

const FARBE = {
  schein: "#6B8F71",
  kante: "#4E6E55",
  scheinTöne: ["#6B8F71", "#759A7B", "#64886A", "#70947A"],
  silhouette: "#9AA8A0",
  erde: "#4278d2",
  erdeNacht: "#2151af",
};

const TEXT_UNTEN = H - RAND;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

// ---------- Himmel ----------
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
const himmelFarbe = (alt: number) => {
  if (alt <= 1) return mix(DS.hell, DS.hell, 0);
  if (alt <= 100) return mix(DS.hell, DS.card, Math.log10(alt) / 2);
  if (alt <= 400) return mix(DS.card, DS.background, Math.log10(alt / 100) / Math.log10(4));
  return mix(DS.background, DS.background, 0);
};
const sternSicht = (alt: number) => clamp01(Math.log10(Math.max(alt, 1) / 100) / Math.log10(4));
const hoeheBeiY = (cam: Kamera, y: number) => cam.cy + (H / 2 - y) * cam.k;

// Stopps an festen Höhen, damit der Übergang bei jedem Zoom an der richtigen Stelle sitzt.
const HIMMEL_HOEHEN = [0, 1, 2, 5, 10, 20, 50, 100, 200, 400];
const Himmel: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const yBei = (alt: number) => H / 2 - (alt - cam.cy) / cam.k;
  const stops = [
    { y: 0, c: himmelFarbe(hoeheBeiY(cam, 0)) },
    ...HIMMEL_HOEHEN.map((alt) => ({ y: yBei(alt), c: himmelFarbe(alt) })).filter((p) => p.y > 0 && p.y < H),
    { y: H, c: himmelFarbe(hoeheBeiY(cam, H)) },
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

const STERNE = (() => {
  const r = zufall(7);
  return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * H, r: 1.1 + r() * 1.6, a: 0.3 + r() * 0.6, tiefe: 0.35 + r() * 0.65 }));
})();
// Sterne driften mit log(Kamerahöhe): beim schnellen Steigflug ziehen sie Schlieren (Warp).
const parallaxe = (cam: Kamera) => Math.log10(Math.max(cam.cy, 0) + 1) * 520;

const Sterne: React.FC<{ cam: Kamera; vorher: Kamera }> = ({ cam, vorher }) => {
  const p = parallaxe(cam);
  const dp = p - parallaxe(vorher);
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      {STERNE.map((s, i) => {
        const y = (((s.y + p * s.tiefe) % H) + H) % H;
        const o = sternSicht(hoeheBeiY(cam, y)) * s.a;
        if (o <= 0.01) return null;
        const zug = Math.min(Math.abs(dp) * s.tiefe * 1.4, 160);
        return zug > 2 ? (
          <line key={i} x1={s.x} x2={s.x} y1={y} y2={y - Math.sign(dp) * zug} stroke={DS.foreground} strokeWidth={s.r * 1.3} strokeLinecap="round" opacity={o * 0.8} />
        ) : (
          <circle key={i} cx={s.x} cy={y} r={s.r} fill={DS.foreground} opacity={o} />
        );
      })}
    </svg>
  );
};

// ---------- Wolken ----------
type Wolke = { x: number; alt: number; w: number; h: number; vorne: boolean };
const WOLKEN: Wolke[] = (() => {
  const anker = [KAL_X_KM, ...PROJEKTE.map((_, i) => stapelXKm(i))];
  const out: Wolke[] = [];
  anker.forEach((ax, j) => {
    const r = zufall(100 + j);
    for (let n = 0; n < 9; n++) {
      out.push({ x: ax + (r() - 0.5) * 30, alt: 7 + r() * 4, w: 2.5 + r() * 4, h: 0.6 + r() * 0.6, vorne: n % 3 === 0 });
    }
  });
  return out;
})();

const Wolken: React.FC<{ cam: Kamera; vorne: boolean }> = ({ cam, vorne }) => (
  <g>
    {WOLKEN.filter((w) => w.vorne === vorne).map((w, i) => {
      const [x, y] = zuBild(cam, w.x, w.alt);
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

// ---------- Gebäude (echte Höhe) ----------
// Halbe Breite und Höhe in Metern.
const BURJ_PROFIL: [number, number][] = [
  [45, 0], [45, 160], [36, 160], [36, 310], [28, 310], [28, 440], [20, 440],
  [20, 560], [13, 560], [13, 640], [7, 640], [7, 700], [3, 700], [0.8, 828],
];
const HOCHHAUS_PROFIL: [number, number][] = [[17, 0], [17, 92], [9, 92], [9, 100]];

const Silhouette: React.FC<{ cam: Kamera; xKm: number; profil: [number, number][] }> = ({ cam, xKm, profil }) => {
  const rechts = profil.map(([b, h]) => zuBild(cam, xKm + b / 1000, h / 1000));
  const links = [...profil].reverse().map(([b, h]) => zuBild(cam, xKm - b / 1000, h / 1000));
  const hoehePx = profil[profil.length - 1][1] / 1000 / cam.k;
  if (hoehePx < 1 || rechts[0][0] < -200 || links[links.length - 1][0] > W + 200) return null;
  return <polygon points={[...rechts, ...links].map((p) => p.join(",")).join(" ")} fill={FARBE.silhouette} />;
};

// ---------- Stapel ----------
// Leichte Schrägansicht: feste Tiefe in Pixeln, unabhängig vom Zoom.
const TIEFE3D_X = 12;
const TIEFE3D_Y = -7;
const GRUEN_3D = { hell: "#7FA285", dunkel: "#5F8466", seite: "#4E6E55", deckel: "#9CBBA1" };
const MINT_3D = { hell: "#6BE38F", dunkel: "#3FC86A", seite: "#00b666", deckel: "#A5F0BC" };
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
      <feGaussianBlur stdDeviation="20" />
    </filter>
    <radialGradient id="erde-licht" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0" stopColor="#7FA8EA" />
      <stop offset="0.55" stopColor={FARBE.erde} />
      <stop offset="1" stopColor={FARBE.erdeNacht} />
    </radialGradient>
  </>
);
const Stapel: React.FC<{ r: StapelRect; mag: boolean; scheinPx: number; licht?: number }> = ({ r, mag, scheinPx, licht = 0 }) => {
  const oben = Math.max(r.spitze, -20);
  const unten = Math.min(r.basis, H + 20);
  if (unten <= oben || r.hoehePx <= 0) return null;
  const x0 = r.x - r.breite / 2;
  const kante = mag ? DS.primaryDeep : FARBE.kante;
  // In der Nahaufnahme einzelne Scheine (leicht unterschiedliche Töne), sonst glatte Säule.
  const scheine: { y: number; n: number }[] = [];
  const nah = clamp01((scheinPx - 3) / 5);
  if (nah > 0) {
    const start = Math.max(0, Math.floor((r.basis - unten) / scheinPx));
    for (let n = start; n < start + 400; n++) {
      const y = r.basis - (n + 1) * scheinPx;
      if (y + scheinPx <= Math.max(oben, r.spitze)) break;
      scheine.push({ y: Math.max(y, r.spitze), n });
    }
  }
  // Die Front hat exakt die Maßstabshöhe; Seite und Deckel sind nur Tiefe (feste Bildschirmmaße).
  const ton = mag ? MINT_3D : GRUEN_3D;
  const x1 = x0 + r.breite;
  const deckelSichtbar = r.spitze > -20;
  return (
    <g>
      {/* Mint-Bloom hinter dem Mag7-Stapel */}
      {mag ? <rect x={x0 - 10} y={oben} width={r.breite + 32} height={unten - oben} fill={DS.primary} opacity={0.28} filter="url(#bloom)" /> : null}
      <polygon points={`${x1},${oben} ${x1 + TIEFE3D_X},${oben + TIEFE3D_Y} ${x1 + TIEFE3D_X},${unten + TIEFE3D_Y} ${x1},${unten}`} fill={ton.seite} />
      <rect x={x0} y={oben} width={r.breite} height={unten - oben} fill={`url(#${mag ? "front-mint" : "front-gruen"})`} />
      {scheine.map(({ y, n }) => (
        <g key={n} opacity={nah}>
          <rect x={x0} y={y} width={r.breite} height={Math.min(scheinPx, r.basis - n * scheinPx - y)} fill={FARBE.scheinTöne[n % 4]} />
          <line x1={x0} x2={x1} y1={y + 0.75} y2={y + 0.75} stroke={kante} strokeWidth={1.5} />
        </g>
      ))}
      {deckelSichtbar ? (
        <polygon points={`${x0},${r.spitze} ${x0 + TIEFE3D_X},${r.spitze + TIEFE3D_Y} ${x1 + TIEFE3D_X},${r.spitze + TIEFE3D_Y} ${x1},${r.spitze}`} fill={ton.deckel} />
      ) : null}
      {/* Lichtkante, solange der Stapel wächst */}
      {licht > 0 && deckelSichtbar ? (
        <g opacity={licht}>
          <ellipse cx={x0 + r.breite / 2 + TIEFE3D_X / 2} cy={r.spitze + TIEFE3D_Y / 2} rx={62} ry={16} fill={mag ? DS.primary : "#FFFFFF"} opacity={0.55} filter="url(#weich)" />
          <line x1={x0} x2={x1 + TIEFE3D_X} y1={r.spitze + TIEFE3D_Y / 2} y2={r.spitze + TIEFE3D_Y / 2} stroke="#FFFFFF" strokeWidth={2} />
        </g>
      ) : null}
    </g>
  );
};

// Fallender Einzelschein in der Kalibrier-Nahaufnahme
const FallenderSchein: React.FC<{ f: number; r: StapelRect; scheinPx: number }> = ({ f, r, scheinPx }) => {
  const landung = KAL_LANDUNGEN.find((l) => f < l && f >= l - 6);
  if (landung === undefined) return null;
  const t = (f - (landung - 6)) / 6;
  const y = r.spitze - scheinPx - (1 - t * t) * 260;
  return (
    <rect x={r.x - r.breite / 2} y={y} width={r.breite} height={scheinPx} fill={FARBE.scheinTöne[KAL_LANDUNGEN.indexOf(landung) % 4]} stroke={FARBE.kante} strokeWidth={1.5} opacity={fade(f, landung - 6, landung - 4)} />
  );
};

const iconDrop = (f: number, landung: number) =>
  spring({ frame: f - landung, fps: FPS, config: { damping: 8, stiffness: 170, mass: 0.6 } });

// ---------- Marker ----------
type Block = { links: number; rechts: number; oben: number; unten: number; deckung: number };

const MarkerLinien: React.FC<{ cam: Kamera }> = ({ cam }) => (
  <g>
    {markerLayout(cam).map((m) =>
      m.deckung > 0 && m.y > -5 && m.y < H + 5 ? (
        <line key={m.id} x1={0} x2={W} y1={m.y} y2={m.y} stroke={DS.muted} strokeOpacity={0.85 * m.deckung} strokeWidth={2} strokeDasharray="12 10" />
      ) : null,
    )}
  </g>
);

const CHIP_X = 32;
const CHIP_W = 270;
const CHIP_H = 92;
// Wie stark ein Chip an Position `oben` frei ist (0 = verdeckt, 1 = frei); weich über 24 px Abstand.
const frei = (oben: number, bloecke: Block[]) =>
  bloecke.reduce((acc, b) => {
    const vertikal = oben < b.unten + 8 && oben + CHIP_H > b.oben - 8;
    if (!vertikal || b.deckung <= 0) return acc;
    const abstand = Math.max(b.links - (CHIP_X + CHIP_W), CHIP_X - b.rechts);
    return acc * (1 - b.deckung * (1 - clamp01(abstand / 24)));
  }, 1);

// Von oben nach unten platzieren; gesetzte Chips blockieren die folgenden.
const MarkerLabels: React.FC<{ cam: Kamera; bloecke: Block[] }> = ({ cam, bloecke }) => {
  const belegt = [...bloecke];
  const chips = [...markerLayout(cam)].reverse().flatMap((m) => {
    if (m.deckung <= 0) return [];
    const ueber = m.y - 8 - CHIP_H;
    const unter = m.y + 8;
    const oben = frei(ueber, belegt) >= frei(unter, belegt) ? ueber : unter;
    const d = m.deckung * frei(oben, belegt) * clamp01((oben - RAND) / 20) * clamp01((TEXT_UNTEN - oben - CHIP_H) / 20);
    if (d <= 0.01) return [];
    belegt.push({ links: CHIP_X - 30, rechts: CHIP_X + CHIP_W, oben, unten: oben + CHIP_H, deckung: d });
    return [{ m, oben, d }];
  });
  return (
    <>
      {chips.map(({ m, oben, d }) => (
        <div key={m.id} style={{ position: "absolute", left: CHIP_X, top: oben, opacity: d, background: "rgba(6,10,8,0.82)", boxShadow: `0 0 0 1px ${DS.border}`, borderRadius: 8, padding: "6px 14px", color: DS.foreground, lineHeight: "40px" }}>
          <div style={{ fontFamily: inter, fontSize: 36, fontWeight: 600 }}>{m.kurz}</div>
          <div style={{ fontFamily: mono, fontSize: 36, color: DS.muted }}>{formatKm(m.km)}</div>
        </div>
      ))}
    </>
  );
};

// ---------- Erde ----------
const Erde: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const e = erdeBild(cam);
  if (e.r < 1 || e.x + e.r < 0 || e.x - e.r > W) return null;
  return (
    <g>
      <circle cx={e.x} cy={e.y} r={e.r} fill="url(#erde-licht)" />
    </g>
  );
};
const ErdeLabel: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const e = erdeBild(cam);
  if (e.r < 50 || e.x < 50) return null;
  return (
    <div style={{ position: "absolute", left: e.x - 100, width: 200, top: e.y - 22, textAlign: "center", fontFamily: grotesk, fontSize: 36, fontWeight: 600, color: DS.foreground, opacity: clamp01((e.r - 50) / 10) }}>
      Erde
    </div>
  );
};

// ---------- Projektkarte ----------
const kostenKurz = (i: number) => PROJEKTE[i].kosten_anzeige?.split(" (")[0] ?? formatMrd(PROJEKTE[i].kosten_mrd_usd);
const karteStart = (i: number) => wachsEnde(SZENEN[i]) + 6;
// Kosten zählen hoch; die S21-Angabe mit ≈ und € bleibt als Text stehen.
const kostenZaehlend = (i: number, e: number) => PROJEKTE[i].kosten_anzeige ?? formatMrd(Math.round(PROJEKTE[i].kosten_mrd_usd * e * 10) / 10);

const Karte: React.FC<{ i: number; f: number; unten: number }> = ({ i, f, unten }) => {
  const p = PROJEKTE[i];
  const mag = p.id === "mag7";
  const t0 = karteStart(i);
  const aus = prog(f, SZENEN[i].ende, 6);
  const zahl = expoOut(prog(f, t0 + 6, 22));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: H - unten, opacity: 1 - aus, transform: `translateY(${aus * -16}px)` }}>
      <Glas akzent={mag} wipe={expoOut(prog(f, t0, 14))} innen={{ padding: "22px 30px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Woerter f={f} start={t0 + 4} text={p.name} style={{ fontFamily: grotesk, fontSize: 52, fontWeight: 600, lineHeight: "60px", letterSpacing: "-0.01em", color: mag ? DS.primary : DS.foreground }} />
          <Zeile f={f} start={t0 + 6}>
            <Eyebrow akzent={mag} text={`${String(i + 1).padStart(2, "0")} / ${String(PROJEKTE.length).padStart(2, "0")}`} />
          </Zeile>
        </div>
        <Zeile f={f} start={t0 + 8} style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: grotesk, fontSize: 44, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            <span>{kostenZaehlend(i, zahl)}</span>
            <span style={{ width: 2, height: 34, background: DS.borderStrong }} />
            <span>{formatHoehe(HOEHEN_KM[i] * zahl)}</span>
          </div>
        </Zeile>
        <Zeile f={f} start={t0 + 12} style={{ marginTop: 8 }}>
          <div style={{ fontFamily: inter, fontSize: 36, lineHeight: "44px", color: DS.muted }}>{p.kontextzeile}</div>
        </Zeile>
      </Glas>
    </div>
  );
};

// Schockwelle, wenn das Icon aufsetzt
const Aufprall: React.FC<{ f: number; r: StapelRect; landung: number; mag: boolean }> = ({ f, r, landung, mag }) => {
  const t = prog(f, landung + 3, 18);
  if (t <= 0 || t >= 1) return null;
  const e = expoOut(t);
  const rx = 34 + 120 * e;
  return (
    <ellipse cx={r.x + TIEFE3D_X / 2} cy={r.spitze + TIEFE3D_Y / 2} rx={rx} ry={rx * 0.3} fill="none" stroke={mag ? DS.primary : DS.foreground} strokeWidth={3 * (1 - t) + 0.5} opacity={1 - t} />
  );
};

const iconDeckung = (f: number, i: number) => {
  const ende = i + 1 < SZENEN.length ? SZENEN[i + 1].start : FINALE_START;
  return fade(f, wachsEnde(SZENEN[i]), wachsEnde(SZENEN[i]) + 3) * (1 - fade(f, ende, ende + 8));
};

// ---------- Zähler unten rechts: Höhe, im Zoom-out der Maßstab ----------
const Zaehler: React.FC<{ f: number; cam: Kamera }> = ({ f, cam }) => {
  let label = "Höhe";
  let wert = "";
  let d = 0;
  if (f >= FINALE_START) {
    label = "Maßstab";
    wert = `1 px ≙ ${formatHoehe(cam.k)}`;
    d = fade(f, FINALE_START + 6, FINALE_START + 14) * (1 - fade(f, 1476, 1484));
  } else {
    const i = aktiveSzene(f);
    if (i < 0) return null;
    const s = SZENEN[i];
    if (f < wachsStart(s)) {
      wert = formatHoehe(i === 0 ? scheineKm(1e9) : HOEHEN_KM[i - 1]);
      d = i === 0 ? 0 : 1 - fade(f, s.start, s.start + 6);
    } else {
      wert = formatHoehe(stapelHoeheKm(f, i));
      d = fade(f, wachsStart(s), wachsStart(s) + 4);
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

// ---------- Kalibrierung: Überschrift + Maßlinie am Stapel ----------
const KAL_TEXTE = [
  { von: 115, bis: 160, text: `1 Schein = ${formatHoehe(scheineKm(1))}` },
  { von: 169, bis: 207, text: `1 Mio. $ = ${formatHoehe(scheineKm(1e6))}` },
  { von: 227, bis: 278, text: `1 Mrd. $ = ${formatHoehe(scheineKm(1e9))}` },
];
const KAL_TEXT_OBEN = 90;
const KAL_TEXT_UNTEN = 250;
const kalDeckung = (f: number, t: { von: number; bis: number }) => fade(f, t.von, t.von + 6) * (1 - fade(f, t.bis - 8, t.bis));

const KalTitel: React.FC<{ f: number }> = ({ f }) => (
  <>
    {KAL_TEXTE.map((t) => {
      const d = kalDeckung(f, t);
      if (d <= 0) return null;
      return (
        <div key={t.text} style={{ position: "absolute", left: 0, right: 0, top: KAL_TEXT_OBEN, display: "flex", justifyContent: "center", opacity: 1 - fade(f, t.bis - 8, t.bis) }}>
          <Glas wipe={expoOut(prog(f, t.von, 12))} innen={{ padding: "18px 34px 22px" }}>
            <Zeile f={f} start={t.von + 2}>
              <Eyebrow text="Maßstab" />
            </Zeile>
            <Zeile f={f} start={t.von + 5}>
              <div style={{ fontFamily: grotesk, fontSize: 64, fontWeight: 600, lineHeight: "74px", letterSpacing: "-0.015em" }}>{t.text}</div>
            </Zeile>
          </Glas>
        </div>
      );
    })}
  </>
);

const Masslinie: React.FC<{ f: number; r: StapelRect }> = ({ f, r }) => {
  const d = fade(f, 112, 120) * (1 - fade(f, 262, 272));
  if (d <= 0) return null;
  const x = r.x + r.breite / 2 + TIEFE3D_X + 30;
  const oben = Math.max(r.spitze, 40);
  const unten = Math.min(r.basis, H);
  const strich = (y1: number, y2: number, x1 = x, x2 = x) => (
    <>
      <line x1={x1} x2={x2} y1={y1} y2={y2} stroke={DS.background} strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
      <line x1={x1} x2={x2} y1={y1} y2={y2} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </>
  );
  const mitte = (oben + unten) / 2;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", opacity: d }}>
        {strich(oben, unten)}
        {strich(oben, oben, x - 12, x + 12)}
        {strich(unten, unten, x - 12, x + 12)}
      </svg>
      <div style={{ position: "absolute", left: x + 22, top: Math.min(Math.max(mitte - 30, 280), 1110), opacity: d }}>
        <Glas innen={{ padding: "6px 16px", fontFamily: mono, fontSize: 36, fontVariantNumeric: "tabular-nums" }}>{formatHoehe(scheineKm(kalScheine(f)))}</Glas>
      </div>
    </>
  );
};

// ---------- Fortschritt oben ----------
const Fortschritt: React.FC<{ f: number }> = ({ f }) => {
  const a = SZENEN[0].start;
  const b = FINALE_START;
  const d = fade(f, a, a + 10) * (1 - fade(f, b, b + 10));
  if (d <= 0) return null;
  const x = (fr: number) => 60 + ((fr - a) / (b - a)) * (W - 120);
  const jetzt = x(Math.min(Math.max(f, a), b));
  const magStart = x(SZENEN[SZENEN.length - 1].start);
  return (
    <svg width={W} height={60} style={{ position: "absolute", top: 12, opacity: d }}>
      <line x1={60} x2={W - 60} y1={22} y2={22} stroke={DS.background} strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round" />
      <line x1={60} x2={W - 60} y1={22} y2={22} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={3} strokeLinecap="round" />
      <line x1={60} x2={Math.min(jetzt, magStart)} y1={22} y2={22} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      {jetzt > magStart ? <line x1={magStart} x2={jetzt} y1={22} y2={22} stroke={DS.primary} strokeWidth={3} strokeLinecap="round" /> : null}
      {SZENEN.map((s, i) => {
        const cx = x(s.start);
        const aktiv = f >= s.start;
        const mag = i === SZENEN.length - 1;
        return <circle key={s.id} cx={cx} cy={22} r={aktiv ? 6 : 4.5} fill={aktiv ? (mag ? DS.primary : "#FFFFFF") : DS.background} stroke={mag ? DS.primary : "#FFFFFF"} strokeOpacity={0.8} strokeWidth={2} />;
      })}
    </svg>
  );
};

// ---------- Finale ----------
const LABEL_OBEN = 64;
const LABEL_ZEILE = 84;
const LABEL_H = 80;
const labelStart = (zeile: number) => 1458 + zeile * 4;

const FinaleLabels: React.FC<{ f: number; rects: StapelRect[] }> = ({ f, rects }) => {
  const n = rects.length;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {rects.map((r, i) => {
          const zeile = n - 1 - i;
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
              <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * zug} stroke={farbe} strokeWidth={2} strokeOpacity={0.7} />
              <circle cx={x} cy={y1} r={4.5 * punkt} fill={farbe} />
              <circle cx={x} cy={y1} r={4 + 14 * expoOut(prog(f, t0 + 14, 14))} fill="none" stroke={farbe} strokeOpacity={0.6 * (1 - prog(f, t0 + 14, 14))} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {rects.map((r, i) => {
        const zeile = n - 1 - i;
        const t0 = labelStart(zeile);
        if (f < t0) return null;
        const mag = PROJEKTE[i].id === "mag7";
        const e = expoOut(prog(f, t0, 14));
        return (
          <div key={i} style={{ position: "absolute", right: W - (r.x + 30), top: LABEL_OBEN + zeile * LABEL_ZEILE, opacity: e, transform: `translateX(${(1 - e) * -24}px)`, textAlign: "right", fontSize: 36, lineHeight: "40px", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: grotesk, fontWeight: 600, color: mag ? DS.primary : DS.foreground, textShadow: mag ? "0 0 24px rgba(76,214,118,0.45)" : undefined }}>{PROJEKTE[i].name}</div>
            <div style={{ fontFamily: inter, color: mag ? DS.primary : DS.muted }}>{kostenKurz(i)}</div>
          </div>
        );
      })}
    </>
  );
};

const BURJ_ANZAHL = Math.floor(PROJEKTE[PROJEKTE.length - 1].kosten_mrd_usd / PROJEKTE[0].kosten_mrd_usd);

const FinaleTexte: React.FC<{ f: number; burj: StapelRect }> = ({ f, burj }) => {
  const ring = expoOut(prog(f, 1544, 20));
  const umfang = 2 * Math.PI * 38;
  const cx = burj.x + TIEFE3D_X / 2;
  const cy = burj.spitze + TIEFE3D_Y / 2;
  const puls = prog(f, 1566, 24);
  const zahl = Math.round(BURJ_ANZAHL * expoOut(prog(f, 1550, 30)));
  const zeile: React.CSSProperties = { position: "absolute", left: 40, right: 40, top: 1228, textAlign: "center", color: DS.foreground, fontSize: 40, lineHeight: "48px" };
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
      <div style={{ ...zeile, opacity: 1 - fade(f, 1532, 1540) }}>
        <Woerter f={f} start={1484} text="Alle Stapel im echten Größenverhältnis" style={{ fontFamily: grotesk, fontWeight: 600 }} />
      </div>
      {f >= 1544 ? (
        <div style={{ ...zeile, fontFamily: inter }}>
          <Zeile f={f} start={1546}>
            Der KI-Capex könnte{" "}
            <b style={{ fontFamily: grotesk, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{zahl} Burj Khalifas</b> bauen.
          </Zeile>
        </div>
      ) : null}
    </>
  );
};

// ---------- Komposition ----------
export const DollarStapel: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
  const vorher = camera(f - 1);
  const scheinPx = scheineKm(1) / cam.k;

  // Motion Blur nur bei Schwenks: Bildgeschwindigkeit der Weltmitte.
  let blurX = 0;
  let blurY = 0;
  if (cam.schwenk) {
    const a = zuBild(camera(f - 0.5), cam.cx, cam.cy);
    const b = zuBild(camera(f + 0.5), cam.cx, cam.cy);
    blurX = Math.min(Math.abs(b[0] - a[0]) * 0.35, 40);
    blurY = Math.min(Math.abs(b[1] - a[1]) * 0.35, 40);
  }
  const blur = blurX > 0.3 || blurY > 0.3;

  const rects = PROJEKTE.map((_, i) => stapelRect(cam, stapelXKm(i), stapelHoeheKm(f, i)));
  const kalRect = stapelRect(cam, KAL_X_KM, scheineKm(kalScheine(f)));
  const [, bodenY] = zuBild(cam, 0, 0);

  const karten = SZENEN.map((s, i) => ({ i, sichtbar: f >= karteStart(i) && f < s.ende + 6, unten: rects[i].spitze + TIEFE3D_Y / 2 - 122 - 14 })).filter((k) => k.sichtbar);
  const kartenDeckung = (i: number) => fade(f, karteStart(i), karteStart(i) + 8) * (1 - fade(f, SZENEN[i].ende, SZENEN[i].ende + 6));

  const e = erdeBild(cam);
  const bloecke: Block[] = [
    ...karten.map((k) => ({ links: 0, rechts: W, oben: 0, unten: k.unten, deckung: kartenDeckung(k.i) })),
    ...KAL_TEXTE.map((t) => ({ links: 0, rechts: W, oben: KAL_TEXT_OBEN, unten: KAL_TEXT_UNTEN, deckung: kalDeckung(f, t) })),
    ...rects.map((r, i) => ({ links: r.x - 70, rechts: r.x + 80, oben: r.spitze - 130, unten: r.basis, deckung: r.hoehePx > 0 ? Math.max(0.999 * clamp01(r.hoehePx), iconDeckung(f, i)) : 0 })),
    { links: e.x - e.r, rechts: e.x + e.r, oben: e.y - e.r, unten: e.y + e.r, deckung: e.r > 2 ? 1 : 0 },
  ];

  // Tempo-Schlieren bei Schwenks
  const schlieren = clamp01((blurX - 6) / 24);

  return (
    <AbsoluteFill style={{ fontFamily: inter, backgroundColor: DS.background, color: DS.foreground }}>
      <Html5Audio src={staticFile("musik.wav")} />
      <Himmel cam={cam} />
      <Sterne cam={cam} vorher={vorher} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <Verlaeufe />
          <filter id="mb" filterUnits="userSpaceOnUse" x={-200} y={-200} width={W + 400} height={H + 400}>
            <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
          </filter>
        </defs>
        {/* Boden ohne Blur, sonst verschmiert die Kante bei Schwenks */}
        {bodenY < H ? (
          <g>
            <rect x={0} y={Math.max(bodenY, 0)} width={W} height={H - Math.max(bodenY, 0)} fill={DS.card} />
            <line x1={0} x2={W} y1={bodenY} y2={bodenY} stroke={DS.borderStrong} strokeWidth={2} />
          </g>
        ) : null}
        <g filter={blur ? "url(#mb)" : undefined}>
          <Wolken cam={cam} vorne={false} />
          <MarkerLinien cam={cam} />
          <Erde cam={cam} />
          {f < 290 ? <Silhouette cam={cam} xKm={HOCHHAUS_X_KM} profil={HOCHHAUS_PROFIL} /> : null}
          <Silhouette cam={cam} xKm={BURJ_TURM_X_KM} profil={BURJ_PROFIL} />
          {f < 290 ? <Stapel r={kalRect} mag={false} scheinPx={scheinPx} /> : null}
          {f < 145 ? <FallenderSchein f={f} r={kalRect} scheinPx={scheinPx} /> : null}
          {rects.map((r, i) => {
            const s = SZENEN[i];
            const licht = fade(f, wachsStart(s), wachsStart(s) + 4) * (1 - fade(f, wachsEnde(s) - 2, wachsEnde(s) + 8));
            return <Stapel key={i} r={r} mag={PROJEKTE[i].id === "mag7"} scheinPx={scheinPx} licht={licht} />;
          })}
          {rects.map((r, i) => (
            <Aufprall key={i} f={f} r={r} landung={wachsEnde(SZENEN[i])} mag={PROJEKTE[i].id === "mag7"} />
          ))}
          {rects.map((r, i) => {
            const d = iconDeckung(f, i);
            if (d <= 0) return null;
            const s = iconDrop(f, wachsEnde(SZENEN[i]));
            return (
              <g key={i} transform={`translate(${r.x + TIEFE3D_X / 2 - 60} ${r.spitze + TIEFE3D_Y / 2 - 122 - (1 - s) * 90})`} opacity={d}>
                <ProjektIcon id={PROJEKTE[i].id} />
              </g>
            );
          })}
          <Wolken cam={cam} vorne />
        </g>
        {schlieren > 0
          ? [0, 1, 2, 3, 4, 5, 6].map((k) => {
              const y = 150 + k * 147 + ((k * 53) % 40);
              const len = 260 + ((k * 211) % 340);
              const x = ((k * 397 + f * 160) % (W + 900)) - 450;
              return <line key={k} x1={x} x2={x + len} y1={y} y2={y} stroke="#FFFFFF" strokeOpacity={0.18 * schlieren} strokeWidth={2} strokeLinecap="round" />;
            })
          : null}
      </svg>
      {/* Vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.32) 100%)", opacity: clamp01(Math.log10(Math.max(hoeheBeiY(cam, H / 2), 1)) / 2) }} />
      <ErdeLabel cam={cam} />
      <MarkerLabels cam={cam} bloecke={bloecke} />
      {f < 290 ? <Masslinie f={f} r={kalRect} /> : null}
      <KalTitel f={f} />
      {karten.map((k) => (
        <Karte key={k.i} i={k.i} f={f} unten={k.unten} />
      ))}
      <Zaehler f={f} cam={cam} />
      <Fortschritt f={f} />
      {f >= 1450 && f < FINALE_ENDE + 20 ? <FinaleLabels f={f} rects={rects} /> : null}
      {f >= 1480 && f < FINALE_ENDE + 20 ? <FinaleTexte f={f} burj={rects[0]} /> : null}
      <Endcard f={f} />
      <Hook f={f} />
    </AbsoluteFill>
  );
};
