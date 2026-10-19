import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
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

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

const FARBE = {
  boden: "#8EC5E8",
  karman: "#0B1426",
  all: "#05070D",
  schein: "#6B8F71",
  kante: "#4E6E55",
  akzent: "#F5A623",
  akzentKante: "#C27F12",
  grund: "#1C232B",
  silhouette: "#3A4B5C",
  erde: "#2F6FA8",
  erdeNacht: "#1F4C78",
};

const TEXT_OBEN = 200;
const TEXT_UNTEN = H - 340;

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
  if (alt <= 1) return mix(FARBE.boden, FARBE.boden, 0);
  if (alt <= 100) return mix(FARBE.boden, FARBE.karman, Math.log10(alt) / 2);
  if (alt <= 400) return mix(FARBE.karman, FARBE.all, Math.log10(alt / 100) / Math.log10(4));
  return mix(FARBE.all, FARBE.all, 0);
};
const sternSicht = (alt: number) => clamp01(Math.log10(Math.max(alt, 1) / 100) / Math.log10(4));
const hoeheBeiY = (cam: Kamera, y: number) => cam.cy + (H / 2 - y) * cam.k;

const Himmel: React.FC<{ cam: Kamera }> = ({ cam }) => {
  const stops = Array.from({ length: 13 }, (_, i) => {
    const y = (i / 12) * H;
    return `${himmelFarbe(hoeheBeiY(cam, y))} ${((i / 12) * 100).toFixed(1)}%`;
  });
  return <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${stops.join(",")})` }} />;
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
  return Array.from({ length: 34 }, () => ({ x: r() * W, y: r() * H, r: 1.4 + r() * 1.6, a: 0.4 + r() * 0.5 }));
})();

const Sterne: React.FC<{ cam: Kamera }> = ({ cam }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    {STERNE.map((s, i) => {
      const o = sternSicht(hoeheBeiY(cam, s.y)) * s.a;
      return o > 0.01 ? <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={o} /> : null;
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
      out.push({
        x: ax + (r() - 0.5) * 30,
        alt: 7 + r() * 4,
        w: 2.5 + r() * 4,
        h: 0.6 + r() * 0.6,
        vorne: n % 3 === 0,
      });
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
        <g key={i} fill="#FFFFFF" opacity={0.9 * clamp01((rx - 2) / 6)}>
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
const Silhouette: React.FC<{ cam: Kamera; xKm: number; profil: [number, number][] }> = ({ cam, xKm, profil }) => {
  const rechts = profil.map(([b, h]) => zuBild(cam, xKm + b / 1000, h / 1000));
  const links = [...profil].reverse().map(([b, h]) => zuBild(cam, xKm - b / 1000, h / 1000));
  const hoehePx = profil[profil.length - 1][1] / 1000 / cam.k;
  if (hoehePx < 1 || rechts[0][0] < -200 || links[links.length - 1][0] > W + 200) return null;
  return <polygon points={[...rechts, ...links].map((p) => p.join(",")).join(" ")} fill={FARBE.silhouette} />;
};
const HOCHHAUS_PROFIL: [number, number][] = [[17, 0], [17, 92], [9, 92], [9, 100]];

// ---------- Stapel ----------
const Stapel: React.FC<{ r: StapelRect; mag: boolean; scheinPx: number }> = ({ r, mag, scheinPx }) => {
  const oben = Math.max(r.spitze, -20);
  const unten = Math.min(r.basis, H + 20);
  if (unten <= oben || r.hoehePx <= 0) return null;
  const x0 = r.x - r.breite / 2;
  const kante = mag ? FARBE.akzentKante : FARBE.kante;
  const linien: number[] = [];
  const linienDeckung = clamp01((scheinPx - 3) / 5);
  if (linienDeckung > 0) {
    const start = Math.max(1, Math.ceil((r.basis - unten) / scheinPx));
    for (let n = start; ; n++) {
      const y = r.basis - n * scheinPx;
      if (y <= Math.max(oben, r.spitze + 0.5) || linien.length > 400) break;
      linien.push(y);
    }
  }
  // Kanten liegen innerhalb des Rechtecks, damit die Pixelhöhe exakt bleibt.
  return (
    <g>
      <rect x={x0} y={oben} width={r.breite} height={unten - oben} fill={mag ? FARBE.akzent : FARBE.schein} />
      {linien.map((y, i) => (
        <line key={i} x1={x0} x2={x0 + r.breite} y1={y} y2={y} stroke={kante} strokeWidth={2.5} opacity={linienDeckung} />
      ))}
      <line x1={x0 + 1.5} x2={x0 + 1.5} y1={oben} y2={unten} stroke={kante} strokeWidth={3} />
      <line x1={x0 + r.breite - 1.5} x2={x0 + r.breite - 1.5} y1={oben} y2={unten} stroke={kante} strokeWidth={3} />
      {r.hoehePx > 6 && r.spitze > -20 ? (
        <line x1={x0} x2={x0 + r.breite} y1={r.spitze + 1.5} y2={r.spitze + 1.5} stroke={kante} strokeWidth={3} />
      ) : null}
    </g>
  );
};

const iconDrop = (f: number, landung: number) =>
  spring({ frame: f - landung, fps: FPS, config: { damping: 8, stiffness: 170, mass: 0.6 } });

// ---------- Marker ----------
type Block = { oben: number; unten: number; deckung: number };

const MarkerLinien: React.FC<{ cam: Kamera }> = ({ cam }) => (
  <g>
    {markerLayout(cam).map((m) =>
      m.deckung > 0 && m.y > -5 && m.y < H + 5 ? (
        <line key={m.id} x1={0} x2={W} y1={m.y} y2={m.y} stroke="#FFFFFF" strokeOpacity={0.55 * m.deckung} strokeWidth={2} strokeDasharray="14 10" />
      ) : null,
    )}
  </g>
);

const LABEL_H = 88;
const MarkerLabels: React.FC<{ cam: Kamera; bloecke: Block[] }> = ({ cam, bloecke }) => (
  <>
    {markerLayout(cam).map((m) => {
      if (m.deckung <= 0) return null;
      const kollidiert = (o: number) => bloecke.some((b) => b.deckung > 0 && o < b.unten + 10 && o + LABEL_H > b.oben);
      let oben = m.y - 6 - LABEL_H;
      let deckung = m.deckung;
      if (kollidiert(oben)) {
        oben = m.y + 6;
        if (kollidiert(oben)) deckung *= 1 - Math.max(...bloecke.map((b) => b.deckung));
      }
      if (oben < TEXT_OBEN || oben + LABEL_H > TEXT_UNTEN) return null;
      return (
        <div key={m.id} style={{ position: "absolute", left: 32, top: oben, opacity: deckung, color: "#FFFFFF", fontSize: 40, lineHeight: "44px" }}>
          <div style={{ fontWeight: 600, opacity: 0.85 }}>{m.kurz}</div>
          <div style={{ fontWeight: 400, opacity: 0.7 }}>{formatKm(m.km)}</div>
        </div>
      );
    })}
  </>
);

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
  if (e.r < 55 || e.x < 50) return null;
  return (
    <div style={{ position: "absolute", left: e.x - 100, width: 200, top: e.y - 24, textAlign: "center", fontSize: 40, fontWeight: 600, color: "#FFFFFF", opacity: clamp01((e.r - 55) / 10) }}>
      Erde
    </div>
  );
};

// ---------- Karten & Texte ----------
const kostenText = (i: number) => PROJEKTE[i].kosten_anzeige ?? formatMrd(PROJEKTE[i].kosten_mrd_usd);
const kostenKurz = (i: number) => PROJEKTE[i].kosten_anzeige?.split(" (")[0] ?? formatMrd(PROJEKTE[i].kosten_mrd_usd);

const Panel: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: "rgba(11,20,38,0.74)", borderRadius: 28, padding: "22px 32px", color: "#FFFFFF", textAlign: "center", ...style }}>
    {children}
  </div>
);

const Karte: React.FC<{ i: number; f: number; unten: number; deckung: number }> = ({ i, f, unten, deckung }) => {
  const p = PROJEKTE[i];
  const mag = p.id === "mag7";
  const t0 = wachsEnde(SZENEN[i]) + 8;
  const puls = mag ? 1 + 0.16 * Math.sin(Math.PI * clamp01((f - t0 - 14) / 16)) : 1;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: H - unten, opacity: deckung, transform: `translateY(${(1 - deckung) * 20}px)` }}>
      <Panel>
        <div style={{ fontSize: 58, fontWeight: 800, lineHeight: "66px", color: mag ? FARBE.akzent : "#FFFFFF" }}>{p.name}</div>
        <div style={{ fontSize: 46, fontWeight: 600, lineHeight: "56px", marginTop: 6 }}>
          {kostenText(i)} · {formatHoehe(HOEHEN_KM[i])}
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ display: "inline-block", fontSize: 40, fontWeight: 600, lineHeight: "48px", padding: "2px 22px", border: `3px solid ${mag ? FARBE.akzent : "rgba(255,255,255,0.8)"}`, borderRadius: 40, transform: `scale(${puls})` }}>
            {p.laufzeit_badge}
          </span>
        </div>
        <div style={{ fontSize: 40, fontWeight: 400, lineHeight: "50px", marginTop: 10, opacity: 0.85 }}>{p.kontextzeile}</div>
      </Panel>
    </div>
  );
};

const Zaehler: React.FC<{ km: number; deckung: number }> = ({ km, deckung }) =>
  deckung > 0 ? (
    <div style={{ position: "absolute", right: 40, top: 1474, opacity: deckung, color: "#FFFFFF", fontSize: 44, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      Höhe: {formatHoehe(km)}
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
const KAL_TEXT_OBEN = 250;
const KAL_TEXT_UNTEN = 370;
const kalDeckung = (f: number, t: { von: number; bis: number }) => fade(f, t.von, t.von + 8) * (1 - fade(f, t.bis - 8, t.bis));

// ---------- Hook ----------
const Note: React.FC = () => (
  <svg width={600} height={256} viewBox="0 0 600 256">
    <rect x={3} y={3} width={594} height={250} rx={10} fill={FARBE.schein} stroke={FARBE.kante} strokeWidth={6} />
    <rect x={24} y={24} width={552} height={208} rx={6} fill="none" stroke={FARBE.kante} strokeWidth={3} />
    <ellipse cx={300} cy={128} rx={62} ry={80} fill="none" stroke={FARBE.kante} strokeWidth={4} />
    <text x={58} y={88} fontSize={52} fontWeight={800} fill={FARBE.kante} fontFamily={fontFamily}>1</text>
    <text x={514} y={210} fontSize={52} fontWeight={800} fill={FARBE.kante} fontFamily={fontFamily}>1</text>
  </svg>
);

const Hook: React.FC<{ f: number }> = ({ f }) => {
  const fall = spring({ frame: f, fps: FPS, config: { damping: 14, stiffness: 90 } });
  const deckung = 1 - fade(f, 84, 96);
  if (deckung <= 0) return null;
  const textAus = 1 - fade(f, 78, 88);
  return (
    <AbsoluteFill style={{ background: "#000000", opacity: deckung }}>
      <div style={{ position: "absolute", left: 240, top: interpolate(fall, [0, 1], [-320, 470]), transform: `rotate(${interpolate(fall, [0, 1], [-18, -4])}deg)` }}>
        <Note />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 860, textAlign: "center", color: "#FFFFFF", opacity: fade(f, 22, 32) * textAus, fontSize: 60, fontWeight: 800, lineHeight: "72px" }}>
        780 Mrd. $ – so viel investieren die Mag7 2026, größtenteils in KI.
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1160, textAlign: "center", color: "#FFFFFF", opacity: fade(f, 46, 56) * textAus, fontSize: 50, fontWeight: 600, lineHeight: "62px" }}>
        Wie hoch ist das als Stapel aus 1‑Dollar‑Scheinen?
      </div>
    </AbsoluteFill>
  );
};

// ---------- Finale ----------
const LABEL_ZEILE = 94;
const FinaleLabels: React.FC<{ f: number; rects: StapelRect[] }> = ({ f, rects }) => {
  const n = rects.length;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {rects.map((r, i) => {
          const zeile = n - 1 - i;
          const d = fade(f, 1462 + zeile * 4, 1474 + zeile * 4);
          const farbe = PROJEKTE[i].id === "mag7" ? FARBE.akzent : "#FFFFFF";
          const y0 = 204 + zeile * LABEL_ZEILE + LABEL_H + 6;
          return d > 0 ? (
            <g key={i} opacity={d}>
              <line x1={r.x} x2={r.x} y1={y0} y2={r.spitze - 8} stroke={farbe} strokeWidth={2} strokeOpacity={0.85} />
              <circle cx={r.x} cy={r.spitze - 8} r={4} fill={farbe} />
            </g>
          ) : null;
        })}
      </svg>
      {rects.map((r, i) => {
        const zeile = n - 1 - i;
        const d = fade(f, 1462 + zeile * 4, 1474 + zeile * 4);
        const farbe = PROJEKTE[i].id === "mag7" ? FARBE.akzent : "#FFFFFF";
        return d > 0 ? (
          <div key={i} style={{ position: "absolute", right: W - (r.x + 30), top: 204 + zeile * LABEL_ZEILE, opacity: d, textAlign: "right", color: farbe, fontSize: 40, lineHeight: "44px", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 700 }}>{PROJEKTE[i].name}</div>
            <div style={{ fontWeight: 400 }}>{kostenKurz(i)}</div>
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
  const ring = fade(f, 1528, 1546);
  const umfang = 2 * Math.PI * 40;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {ring > 0 ? (
          <circle cx={burj.x} cy={burj.spitze} r={40} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeDasharray={umfang} strokeDashoffset={umfang * (1 - ring)} transform={`rotate(-90 ${burj.x} ${burj.spitze})`} />
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: 40, right: 40, top: 1462, textAlign: "center", color: "#FFFFFF", fontSize: 42, fontWeight: 700, opacity: fade(f, 1486, 1498) }}>
        Alle Stapel im echten Größenverhältnis
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 1522, textAlign: "center", color: "#FFFFFF", fontSize: 42, fontWeight: 400, opacity: fade(f, 1538, 1550) }}>
        Burj Khalifa: {burjAnteil} % des KI-Stapels
      </div>
    </>
  );
};

const Endcard: React.FC<{ f: number }> = ({ f }) => {
  const d = fade(f, 1650, 1666);
  if (d <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(5,7,13,${0.9 * d})` }}>
      <div style={{ position: "absolute", left: 70, right: 70, top: 640, textAlign: "center", color: "#FFFFFF", fontSize: 68, fontWeight: 800, lineHeight: "84px", opacity: fade(f, 1660, 1676) }}>
        Mehr als Apollo, Manhattan-Projekt, Marshallplan und ISS zusammen – in einem Jahr.
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: H - TEXT_UNTEN, textAlign: "center", color: "#FFFFFF", fontSize: 40, fontWeight: 400, lineHeight: "52px", opacity: 0.7 * fade(f, 1680, 1692) }}>
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
  const iconsAus = 1 - fade(f, FINALE_START, FINALE_START + 20);

  // Karte der aktiven bzw. gerade verlassenen Szene
  const karten = SZENEN.map((s, i) => {
    const d = fade(f, wachsEnde(s) + 8, wachsEnde(s) + 18) * (1 - fade(f, s.ende, s.ende + 6));
    const iconOben = rects[i].spitze - 4 - 120;
    return { i, d, unten: iconOben - 18 };
  }).filter((k) => k.d > 0);

  const bloecke: Block[] = [
    ...karten.map((k) => ({ oben: TEXT_OBEN, unten: k.unten, deckung: k.d })),
    ...KAL_TEXTE.map((t) => ({ oben: KAL_TEXT_OBEN, unten: KAL_TEXT_UNTEN, deckung: kalDeckung(f, t) })),
  ];
  const z = zaehlerStand(f);

  return (
    <AbsoluteFill style={{ fontFamily, backgroundColor: FARBE.all }}>
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
        {bodenY < H ? <rect x={0} y={Math.max(bodenY, 0)} width={W} height={H - Math.max(bodenY, 0)} fill={FARBE.grund} /> : null}
        <g filter={blur ? "url(#mb)" : undefined}>
          <Wolken cam={cam} vorne={false} />
          <MarkerLinien cam={cam} />
          <Erde cam={cam} />
          {f < 260 ? <Silhouette cam={cam} xKm={HOCHHAUS_X_KM} profil={HOCHHAUS_PROFIL} /> : null}
          <Silhouette cam={cam} xKm={BURJ_TURM_X_KM} profil={BURJ_PROFIL} />
          {f < 260 ? <Stapel r={kalRect} mag={false} scheinPx={scheinPx} /> : null}
          {rects.map((r, i) => (
            <Stapel key={i} r={r} mag={PROJEKTE[i].id === "mag7"} scheinPx={scheinPx} />
          ))}
          {rects.map((r, i) => {
            const landung = wachsEnde(SZENEN[i]);
            if (f < landung || iconsAus <= 0) return null;
            const s = iconDrop(f, landung);
            return (
              <g key={i} transform={`translate(${r.x - 60} ${r.spitze - 124 - (1 - s) * 90})`} opacity={fade(f, landung, landung + 3) * iconsAus}>
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
            <Panel style={{ fontSize: 64, fontWeight: 800, lineHeight: "76px" }}>{t.text}</Panel>
          </div>
        ) : null;
      })}
      {karten.map((k) => (
        <Karte key={k.i} i={k.i} f={f} unten={k.unten} deckung={k.d} />
      ))}
      <Zaehler km={z.km} deckung={z.deckung} />
      {f >= 1450 ? <FinaleLabels f={f} rects={rects} /> : null}
      {f >= 1480 ? <FinaleTexte f={f} burj={rects[0]} /> : null}
      <Endcard f={f} />
      <Hook f={f} />
    </AbsoluteFill>
  );
};
