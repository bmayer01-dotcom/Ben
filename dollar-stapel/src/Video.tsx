import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as ladeInter } from "@remotion/google-fonts/Inter";
import { loadFont as ladeGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as ladeMono } from "@remotion/google-fonts/JetBrainsMono";
import { PROJEKTE } from "./data.ts";
import { formatHoehe, formatKm, formatMrd, scheineKm } from "./scale.ts";
import {
  aktiveSzene,
  BURJ_TURM_X_KM,
  camera,
  erdeBild,
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
import { ProjektIcon } from "./icons.tsx";
import { SCHEIN_W, ScheinOben, TIEFE_X, TIEFE_Y } from "./schein.tsx";

const inter = ladeInter("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;
const grotesk = ladeGrotesk("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
const mono = ladeMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

// mAI-Consult-Tokens (dunkel wie die Website, hell #F3F8F5 für den Himmel am Boden)
const DS = {
  background: "#060a08",
  card: "#0b110e",
  border: "#1d2320",
  borderStrong: "#343d38",
  foreground: "#eff3f1",
  muted: "#89918d",
  primary: "#4cd676",
  primaryDeep: "#00b666",
  hell: "#F3F8F5",
};
const FARBE = {
  schein: "#6B8F71",
  kante: "#4E6E55",
  scheinTöne: ["#6B8F71", "#759A7B", "#64886A", "#70947A"],
  silhouette: "#9AA8A0",
  erde: "#4278d2",
  erdeNacht: "#2151af",
};

const RAND = 60; // Textabstand oben/unten im 4:5-Format
const TEXT_UNTEN = H - RAND;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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
  return Array.from({ length: 30 }, () => ({ x: r() * W, y: r() * H, r: 1.3 + r() * 1.5, a: 0.35 + r() * 0.5 }));
})();

const Sterne: React.FC<{ cam: Kamera }> = ({ cam }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    {STERNE.map((s, i) => {
      const o = sternSicht(hoeheBeiY(cam, s.y)) * s.a;
      return o > 0.01 ? <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={DS.foreground} opacity={o} /> : null;
    })}
  </svg>
);

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
const Stapel: React.FC<{ r: StapelRect; mag: boolean; scheinPx: number }> = ({ r, mag, scheinPx }) => {
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
  // Kanten liegen innerhalb des Rechtecks, damit die Pixelhöhe exakt bleibt.
  return (
    <g>
      <rect x={x0} y={oben} width={r.breite} height={unten - oben} fill={mag ? DS.primary : FARBE.schein} />
      {scheine.map(({ y, n }) => (
        <g key={n} opacity={nah}>
          <rect x={x0} y={y} width={r.breite} height={Math.min(scheinPx, r.basis - n * scheinPx - y)} fill={FARBE.scheinTöne[n % 4]} />
          <line x1={x0} x2={x0 + r.breite} y1={y + 0.75} y2={y + 0.75} stroke={kante} strokeWidth={1.5} />
        </g>
      ))}
      <line x1={x0 + 1.5} x2={x0 + 1.5} y1={oben} y2={unten} stroke={kante} strokeWidth={3} />
      <line x1={x0 + r.breite - 1.5} x2={x0 + r.breite - 1.5} y1={oben} y2={unten} stroke={kante} strokeWidth={3} />
      {r.hoehePx > 6 && r.spitze > -20 ? (
        <line x1={x0} x2={x0 + r.breite} y1={r.spitze + 1.5} y2={r.spitze + 1.5} stroke={kante} strokeWidth={3} />
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
      <circle cx={e.x} cy={e.y} r={e.r} fill={FARBE.erde} />
      <path d={`M ${e.x} ${e.y - e.r} A ${e.r} ${e.r} 0 0 1 ${e.x} ${e.y + e.r} A ${e.r * 0.45} ${e.r} 0 0 0 ${e.x} ${e.y - e.r} Z`} fill={FARBE.erdeNacht} />
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

// ---------- Karten & Texte ----------
const kostenText = (i: number) => PROJEKTE[i].kosten_anzeige ?? formatMrd(PROJEKTE[i].kosten_mrd_usd);
const kostenKurz = (i: number) => PROJEKTE[i].kosten_anzeige?.split(" (")[0] ?? formatMrd(PROJEKTE[i].kosten_mrd_usd);

const Panel: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: "rgba(11,17,14,0.94)", boxShadow: `0 0 0 1px ${DS.border}`, borderRadius: 12, padding: "18px 28px", color: DS.foreground, textAlign: "center", ...style }}>
    {children}
  </div>
);

const Karte: React.FC<{ i: number; unten: number; deckung: number }> = ({ i, unten, deckung }) => {
  const p = PROJEKTE[i];
  const mag = p.id === "mag7";
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: H - unten, opacity: deckung, transform: `translateY(${(1 - deckung) * 16}px)` }}>
      <Panel style={mag ? { boxShadow: `0 0 0 2px ${DS.primary}` } : undefined}>
        <div style={{ fontFamily: grotesk, fontSize: 48, fontWeight: 600, lineHeight: "56px", color: mag ? DS.primary : DS.foreground }}>{p.name}</div>
        <div style={{ fontFamily: inter, fontSize: 36, fontWeight: 600, lineHeight: "46px", marginTop: 4 }}>
          {kostenText(i)} <span style={{ color: DS.muted }}>·</span> {formatHoehe(HOEHEN_KM[i])}
        </div>
        <div style={{ fontFamily: inter, fontSize: 36, fontWeight: 400, lineHeight: "44px", marginTop: 8, color: DS.muted }}>{p.kontextzeile}</div>
      </Panel>
    </div>
  );
};

const Zaehler: React.FC<{ km: number; deckung: number }> = ({ km, deckung }) =>
  deckung > 0 ? (
    <div style={{ position: "absolute", right: 40, top: 1214, opacity: deckung, display: "flex", alignItems: "baseline", gap: 14 }}>
      <span style={{ fontFamily: mono, fontSize: 36, color: DS.muted }}>Höhe</span>
      <span style={{ fontFamily: grotesk, fontSize: 48, fontWeight: 600, color: DS.foreground, fontVariantNumeric: "tabular-nums" }}>{formatHoehe(km)}</span>
    </div>
  ) : null;

const zaehlerStand = (f: number): { km: number; deckung: number } => {
  if (f < SZENEN[0].start) {
    return { km: scheineKm(kalScheine(f)), deckung: fade(f, 96, 104) };
  }
  const i = aktiveSzene(f);
  if (i < 0) return { km: HOEHEN_KM[HOEHEN_KM.length - 1], deckung: 1 - fade(f, FINALE_START, FINALE_START + 10) };
  const s = SZENEN[i];
  if (f < wachsStart(s)) {
    const vorher = i === 0 ? scheineKm(1e9) : HOEHEN_KM[i - 1];
    return { km: vorher, deckung: 1 - fade(f, s.start, s.start + 6) };
  }
  return { km: stapelHoeheKm(f, i), deckung: fade(f, wachsStart(s), wachsStart(s) + 4) };
};

const KAL_TEXTE = [
  { von: 100, bis: 142, text: `1 Schein = ${formatHoehe(scheineKm(1))}` },
  { von: 154, bis: 190, text: `1 Mio. $ = ${formatHoehe(scheineKm(1e6))}` },
  { von: 212, bis: 246, text: `1 Mrd. $ = ${formatHoehe(scheineKm(1e9))}` },
];
const KAL_TEXT_OBEN = 90;
const KAL_TEXT_UNTEN = 190;
const kalDeckung = (f: number, t: { von: number; bis: number }) => fade(f, t.von, t.von + 8) * (1 - fade(f, t.bis - 8, t.bis));

// ---------- Hook: Scheine fallen und türmen sich auf ----------
const STAPEL_X0 = 202; // vordere linke Ecke des Hook-Stapels
const STAPEL_BASIS = 1150;
const PX_PRO_SCHEIN = 0.42; // 600 px ≙ 156 mm
const ABWUERFE = (() => {
  const n = 24;
  const r = zufall(42);
  return Array.from({ length: n }, (_, j) => ({
    landung: Math.round(j === 0 ? 20 : 26 + 54 * Math.pow(j / (n - 1), 0.7)),
    anzahl: Math.round(Math.pow(1000, j / (n - 1))),
    dx: j === 0 ? 0 : (r() - 0.5) * 36,
    dreh: (r() - 0.5) * 6,
  }));
})();
const nf = new Intl.NumberFormat("de-DE");

const Hook: React.FC<{ f: number }> = ({ f }) => {
  const aus = fade(f, 84, 96);
  if (aus >= 1) return null;

  // Stapelhöhe: wächst nach jeder Landung weich auf die neue Anzahl
  let anzahl = 0;
  ABWUERFE.forEach((a, j) => {
    if (f < a.landung) return;
    const vorher = j === 0 ? 0 : ABWUERFE[j - 1].anzahl;
    anzahl = vorher + (a.anzahl - vorher) * clamp01((f - a.landung) / 4);
  });
  const hPx = anzahl * PX_PRO_SCHEIN;
  const yOben = STAPEL_BASIS - hPx;
  const gelandet = ABWUERFE.filter((a) => f >= a.landung);
  const oberster = gelandet[gelandet.length - 1];

  // Papierkanten: dünne Streifen mit leichtem Versatz, damit der Stapel unordentlich wirkt
  const streifen: { y: number; dx: number; ton: number }[] = [];
  const r = zufall(9);
  for (let y = STAPEL_BASIS; y > yOben + 0.5; y -= 3) streifen.push({ y, dx: (r() - 0.5) * 7, ton: r() });

  return (
    <AbsoluteFill style={{ background: DS.background, opacity: 1 - aus, transform: `scale(${1 + aus * 0.6})`, transformOrigin: `${STAPEL_X0 + SCHEIN_W / 2}px ${STAPEL_BASIS - 120}px` }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: RAND + 10, textAlign: "center", color: DS.foreground, opacity: fade(f, 4, 14), fontFamily: grotesk, fontSize: 56, fontWeight: 600, lineHeight: "66px" }}>
        <span style={{ color: DS.primary }}>780 Mrd. $</span> – so viel investieren die Mag7 2026 in KI.
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 300, textAlign: "center", color: DS.muted, opacity: fade(f, 40, 50), fontFamily: inter, fontSize: 40, lineHeight: "52px" }}>
        Wie hoch ist das als Stapel aus 1‑Dollar‑Scheinen?
      </div>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {hPx > 0 ? (
          <g>
            {/* Seitenfläche rechts */}
            <polygon
              points={`${STAPEL_X0 + SCHEIN_W},${yOben} ${STAPEL_X0 + SCHEIN_W + TIEFE_X},${yOben + TIEFE_Y} ${STAPEL_X0 + SCHEIN_W + TIEFE_X},${STAPEL_BASIS + TIEFE_Y} ${STAPEL_X0 + SCHEIN_W},${STAPEL_BASIS}`}
              fill="#A9B5A2"
            />
            {/* Vorderkante aus Papierstreifen */}
            {streifen.map((s, i) => (
              <rect key={i} x={STAPEL_X0 + s.dx} y={Math.max(s.y - 3, yOben)} width={SCHEIN_W} height={Math.min(3, s.y - yOben)} fill={mix("#C3CDB9", "#D6DECC", s.ton)} />
            ))}
            {streifen.map((s, i) => (i % 2 === 0 ? <line key={`l${i}`} x1={STAPEL_X0 + s.dx} x2={STAPEL_X0 + s.dx + SCHEIN_W} y1={s.y} y2={s.y} stroke="#8D9B87" strokeWidth={0.8} /> : null))}
          </g>
        ) : null}
        {oberster ? <ScheinOben id="oben" fontFamily={grotesk} x0={STAPEL_X0 + oberster.dx * 0.3} y0={yOben} drehung={oberster.dreh * 0.3} /> : null}
        {/* Scheine im Flug */}
        {ABWUERFE.map((a, j) => {
          const dauer = j === 0 ? 20 : 7;
          const t = (f - (a.landung - dauer)) / dauer;
          if (t < 0 || t >= 1) return null;
          const yZiel = STAPEL_BASIS - (j === 0 ? 0 : ABWUERFE[j - 1].anzahl * PX_PRO_SCHEIN);
          const yStart = j === 0 ? 540 : 580;
          const y = yStart + (yZiel - yStart) * t * t;
          return (
            <ScheinOben key={j} id={`flug${j}`} fontFamily={grotesk} x0={STAPEL_X0 + a.dx} y0={y} drehung={a.dreh * (1 + 1.5 * (1 - t))} deckung={j === 0 ? 1 : clamp01(t * 4)} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: STAPEL_BASIS + 30, textAlign: "center", fontFamily: mono, fontSize: 36, color: DS.muted, opacity: fade(f, 22, 30) }}>
        {nf.format(Math.round(anzahl))} $
      </div>
    </AbsoluteFill>
  );
};

// ---------- Finale ----------
const LABEL_OBEN = 64;
const LABEL_ZEILE = 84;
const LABEL_H = 80;
const labelDeckung = (f: number, zeile: number) => fade(f, 1462 + zeile * 4, 1474 + zeile * 4);

const FinaleLabels: React.FC<{ f: number; rects: StapelRect[] }> = ({ f, rects }) => {
  const n = rects.length;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {rects.map((r, i) => {
          const zeile = n - 1 - i;
          const d = labelDeckung(f, zeile);
          const farbe = PROJEKTE[i].id === "mag7" ? DS.primary : DS.foreground;
          const y0 = LABEL_OBEN + zeile * LABEL_ZEILE + LABEL_H + 6;
          return d > 0 ? (
            <g key={i} opacity={d}>
              <line x1={r.x} x2={r.x} y1={y0} y2={r.spitze - 8} stroke={farbe} strokeWidth={2} strokeOpacity={0.7} />
              <circle cx={r.x} cy={r.spitze - 8} r={4} fill={farbe} />
            </g>
          ) : null;
        })}
      </svg>
      {rects.map((r, i) => {
        const zeile = n - 1 - i;
        const d = labelDeckung(f, zeile);
        const mag = PROJEKTE[i].id === "mag7";
        return d > 0 ? (
          <div key={i} style={{ position: "absolute", right: W - (r.x + 30), top: LABEL_OBEN + zeile * LABEL_ZEILE, opacity: d, textAlign: "right", fontSize: 36, lineHeight: "40px", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: grotesk, fontWeight: 600, color: mag ? DS.primary : DS.foreground }}>{PROJEKTE[i].name}</div>
            <div style={{ fontFamily: inter, color: mag ? DS.primary : DS.muted }}>{kostenKurz(i)}</div>
          </div>
        ) : null;
      })}
    </>
  );
};

const burjAnteil = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(
  (PROJEKTE[0].kosten_mrd_usd / PROJEKTE[PROJEKTE.length - 1].kosten_mrd_usd) * 100,
);

const FinaleTexte: React.FC<{ f: number; burj: StapelRect }> = ({ f, burj }) => {
  const ring = fade(f, 1544, 1562);
  const umfang = 2 * Math.PI * 38;
  const zeile: React.CSSProperties = { position: "absolute", left: 40, right: 40, top: 1228, textAlign: "center", color: DS.foreground, fontSize: 40, lineHeight: "48px" };
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {ring > 0 ? (
          <circle cx={burj.x} cy={burj.spitze} r={38} fill="none" stroke={DS.foreground} strokeWidth={4} strokeDasharray={umfang} strokeDashoffset={umfang * (1 - ring)} transform={`rotate(-90 ${burj.x} ${burj.spitze})`} />
        ) : null}
      </svg>
      <div style={{ ...zeile, fontFamily: grotesk, fontWeight: 600, opacity: fade(f, 1486, 1498) * (1 - fade(f, 1534, 1542)) }}>
        Alle Stapel im echten Größenverhältnis
      </div>
      <div style={{ ...zeile, fontFamily: inter, opacity: fade(f, 1546, 1558) }}>
        Burj Khalifa: <b style={{ fontFamily: grotesk, fontWeight: 600 }}>{burjAnteil} %</b> des KI-Stapels
      </div>
    </>
  );
};

const Endcard: React.FC<{ f: number }> = ({ f }) => {
  const d = fade(f, 1650, 1666);
  if (d <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(6,10,8,${0.96 * d})` }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 300, textAlign: "center", color: DS.foreground, fontFamily: grotesk, fontSize: 64, fontWeight: 600, lineHeight: "78px", opacity: fade(f, 1660, 1676) }}>
        Mehr als Apollo, Manhattan-Projekt, Marshallplan und ISS zusammen – <span style={{ color: DS.primary }}>in einem Jahr.</span>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: RAND, textAlign: "center", color: DS.muted, fontFamily: inter, fontSize: 36, lineHeight: "46px", opacity: fade(f, 1680, 1692) }}>
        Höhe maßstabsgetreu, Breite nicht. Projektkosten inflationsbereinigt (USD); Stuttgart 21 und Burj Khalifa nominal. Mag7: Capex-Guidance Q2/2026 inkl. Nicht-KI-Anteilen. Scheindicke 0,1092 mm.
      </div>
    </AbsoluteFill>
  );
};

// ---------- Komposition ----------
export const DollarStapel: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
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

  // Nur das Icon der aktuellen Szene steht auf der Spitze; beim nächsten Schwenk blendet es aus.
  const iconDeckung = (i: number) => {
    const ende = i + 1 < SZENEN.length ? SZENEN[i + 1].start : FINALE_START;
    return fade(f, wachsEnde(SZENEN[i]), wachsEnde(SZENEN[i]) + 3) * (1 - fade(f, ende, ende + 8));
  };

  const karten = SZENEN.map((s, i) => {
    const d = fade(f, wachsEnde(s) + 8, wachsEnde(s) + 18) * (1 - fade(f, s.ende, s.ende + 6));
    return { i, d, unten: rects[i].spitze - 4 - 120 - 18 };
  }).filter((k) => k.d > 0);

  const e = erdeBild(cam);
  const bloecke: Block[] = [
    ...karten.map((k) => ({ links: 0, rechts: W, oben: 0, unten: k.unten, deckung: k.d })),
    ...KAL_TEXTE.map((t) => ({ links: 0, rechts: W, oben: KAL_TEXT_OBEN, unten: KAL_TEXT_UNTEN, deckung: kalDeckung(f, t) })),
    ...rects.map((r, i) => ({ links: r.x - 70, rechts: r.x + 70, oben: r.spitze - 130, unten: r.basis, deckung: r.hoehePx > 0 ? Math.max(0.999 * clamp01(r.hoehePx), iconDeckung(i)) : 0 })),
    { links: e.x - e.r, rechts: e.x + e.r, oben: e.y - e.r, unten: e.y + e.r, deckung: e.r > 2 ? 1 : 0 },
  ];
  const z = zaehlerStand(f);

  return (
    <AbsoluteFill style={{ fontFamily: inter, backgroundColor: DS.background }}>
      <Html5Audio src={staticFile("musik.wav")} />
      <Himmel cam={cam} />
      <Sterne cam={cam} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
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
          {f < 260 ? <Silhouette cam={cam} xKm={HOCHHAUS_X_KM} profil={HOCHHAUS_PROFIL} /> : null}
          <Silhouette cam={cam} xKm={BURJ_TURM_X_KM} profil={BURJ_PROFIL} />
          {f < 260 ? <Stapel r={kalRect} mag={false} scheinPx={scheinPx} /> : null}
          {f < 130 ? <FallenderSchein f={f} r={kalRect} scheinPx={scheinPx} /> : null}
          {rects.map((r, i) => (
            <Stapel key={i} r={r} mag={PROJEKTE[i].id === "mag7"} scheinPx={scheinPx} />
          ))}
          {rects.map((r, i) => {
            const d = iconDeckung(i);
            if (d <= 0) return null;
            const s = iconDrop(f, wachsEnde(SZENEN[i]));
            return (
              <g key={i} transform={`translate(${r.x - 60} ${r.spitze - 124 - (1 - s) * 90})`} opacity={d}>
                <ProjektIcon id={PROJEKTE[i].id} />
              </g>
            );
          })}
          <Wolken cam={cam} vorne />
        </g>
      </svg>
      <ErdeLabel cam={cam} />
      <MarkerLabels cam={cam} bloecke={bloecke} />
      {KAL_TEXTE.map((t) => {
        const d = kalDeckung(f, t);
        return d > 0 ? (
          <div key={t.text} style={{ position: "absolute", left: 0, right: 0, top: KAL_TEXT_OBEN, display: "flex", justifyContent: "center", opacity: d }}>
            <Panel style={{ fontFamily: grotesk, fontSize: 60, fontWeight: 600, lineHeight: "64px" }}>{t.text}</Panel>
          </div>
        ) : null;
      })}
      {karten.map((k) => (
        <Karte key={k.i} i={k.i} unten={k.unten} deckung={k.d} />
      ))}
      <Zaehler km={z.km} deckung={z.deckung} />
      {f >= 1450 ? <FinaleLabels f={f} rects={rects} /> : null}
      {f >= 1480 ? <FinaleTexte f={f} burj={rects[0]} /> : null}
      <Endcard f={f} />
      <Hook f={f} />
    </AbsoluteFill>
  );
};
