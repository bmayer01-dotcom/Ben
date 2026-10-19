// Eine Welt, eine Kamera. Weltkoordinaten in km: x horizontal, Höhe über der Grundlinie.
// Alles hier ist rein (ohne React/Remotion), damit der Test denselben Code prüft, der rendert.
import { ERDE_DURCHMESSER_KM, HOEHENMARKER, PROJEKTE } from "./data.ts";
import { hoeheKm, scheineKm } from "./scale.ts";

export const W = 1080;
export const H = 1350; // 4:5 für den LinkedIn-Feed
export const FPS = 30;
export const DAUER = 1800;

export const STAPEL_BREITE_PX = 60; // feste Bildschirmbreite, unabhängig vom Zoom
export const BASIS_Y = 1180; // Grundlinie auf dem Bildschirm, solange sie im Bild ist
export const SPITZE_Y = 520; // Ruhelage der Stapelspitze

const FINALE_ABSTAND_PX = 90;
const FINALE_MAX_PX = 740;
const FINALE_ERSTER_X = 360;

export const HOEHEN_KM = PROJEKTE.map((p) => hoeheKm(p.kosten_mrd_usd));
export const K_FINALE = Math.max(...HOEHEN_KM) / FINALE_MAX_PX;
export const ABSTAND_KM = FINALE_ABSTAND_PX * K_FINALE;
export const stapelXKm = (i: number) => i * ABSTAND_KM;

export const ERDE_R_KM = ERDE_DURCHMESSER_KM / 2;
export const ERDE_X_KM =
  stapelXKm(0) - (STAPEL_BREITE_PX / 2 + 50) * K_FINALE - ERDE_R_KM;

// Kalibrierstapel und Hochhaus stehen zwischen Erde und Burj-Stapel.
export const KAL_X_KM = -3000;
export const HOCHHAUS_X_KM = KAL_X_KM - 0.07;
export const BURJ_TURM_X_KM = stapelXKm(0) - 0.32;
export const K_MAKRO = scheineKm(1) / 36;

export type Kamera = { cx: number; cy: number; k: number; schwenk: boolean };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const ease = (t: number) => easeInOutSine(clamp01(t));
const logLerp = (a: number, b: number, t: number) =>
  Math.exp(lerp(Math.log(a), Math.log(b), t));

type Rahmen = { X: number; kS: number; L: number };

// Kamera, die einen Stapel der Höhe h bei x zeigt: erst wächst er im Bild,
// dann bleibt die Spitze bei SPITZE_Y und die Welt zoomt heraus.
const rahmen = (xKm: number, hKm: number, r: Rahmen): Kamera => {
  const k = Math.sqrt(r.kS ** 2 + (hKm / r.L) ** 2);
  const basisY = Math.max(BASIS_Y, SPITZE_Y + hKm / k);
  return { cx: xKm + (W / 2 - r.X) * k, cy: (basisY - H / 2) * k, k, schwenk: false };
};

// Fahrt zwischen zwei Kameras: Zoom über log(k), Position so, dass die
// Bildschirmgeschwindigkeit gleichmäßig bleibt (Weg ∝ ∫k dq).
const fahrt = (a: Kamera, b: Kamera, u: number, schwenk: boolean): Kamera => {
  const q = easeInOutCubic(clamp01(u));
  const k = logLerp(a.k, b.k, q);
  const w = Math.abs(b.k - a.k) < 1e-9 * a.k ? q : (k - a.k) / (b.k - a.k);
  return { cx: lerp(a.cx, b.cx, w), cy: lerp(a.cy, b.cy, w), k, schwenk };
};

// ---------- Kalibrierung 90–240 ----------
const KAL_RAHMEN: Rahmen = { X: 640, kS: K_MAKRO, L: 730 };
// Hook: Landezeitpunkte der fallenden Scheine (auch für das Sounddesign).
export const HOOK_LANDUNGEN = Array.from({ length: 24 }, (_, j) =>
  Math.round(j === 0 ? 30 : 36 + 58 * Math.pow(j / 23, 0.7)),
);
export const HOOK_ENDE = 105;

// Kalibrierung beginnt bei Frame 105 (nach dem Hook).
export const KAL_LANDUNGEN = [119, 125, 131, 137];
export const kalScheine = (f: number): number => {
  if (f < 143) return 1 + KAL_LANDUNGEN.filter((l) => f >= l).length;
  if (f < 175) return logLerp(4, 1e6, ease((f - 143) / 32));
  if (f < 193) return 1e6;
  if (f < 233) return logLerp(1e6, 1e9, ease((f - 193) / 40));
  return 1e9;
};
const kalKamera = (f: number) => rahmen(KAL_X_KM, scheineKm(kalScheine(f)), KAL_RAHMEN);

// ---------- Projekt-Szenen ----------
export type Szene = {
  id: string;
  start: number;
  ende: number;
  X: number;
  kS: number;
  L: number;
  schwenk: number;
  wachsen: number;
};

const szene = (
  id: string,
  start: number,
  ende: number,
  X: number,
  kS: number,
  wachsen: number,
  L = 730,
): Szene => ({ id, start, ende, X, kS, L, schwenk: 20, wachsen });

export const SZENEN: Szene[] = [
  szene("burj", 270, 400, 620, 0.0014, 50),
  szene("s21", 400, 525, 540, 0.02, 52),
  szene("manhattan", 525, 645, 540, 0.05, 50),
  szene("iss", 645, 765, 540, 0.2, 50),
  szene("marshall", 765, 885, 540, 0.2, 50),
  // Apollo etwas weiter weg, damit die Erde am Bildrand steht.
  szene("apollo", 885, 1045, 860, 1, 70, HOEHEN_KM[5] / 95),
  // Mag7: längste Fahrt, Kamera folgt der Spitze, die Basis verlässt das Bild.
  { ...szene("mag7", 1045, 1380, 600, 2, 230, 2400), schwenk: 24 },
];

export const wachsStart = (s: Szene) => s.start + s.schwenk;
export const wachsEnde = (s: Szene) => wachsStart(s) + s.wachsen;

// Aktuelle Stapelhöhe in km.
export const stapelHoeheKm = (f: number, i: number): number => {
  const s = SZENEN[i];
  const hF = HOEHEN_KM[i];
  if (f < wachsStart(s)) return 0;
  if (f >= wachsEnde(s)) return hF;
  const h0 = s.kS * 3;
  return logLerp(h0, hF, ease((f - wachsStart(s)) / s.wachsen));
};

const endKamera = (i: number): Kamera =>
  i < 0 ? kalKamera(SZENEN[0].start - 1) : rahmen(stapelXKm(i), HOEHEN_KM[i], SZENEN[i]);

export const FINALE_START = 1380;
export const ZOOM_ENDE = 1470;
export const FINALE_ENDE = 1650;

export const FINALE_KAMERA: Kamera = {
  cx: stapelXKm(0) + (W / 2 - FINALE_ERSTER_X) * K_FINALE,
  cy: (BASIS_Y - H / 2) * K_FINALE,
  k: K_FINALE,
  schwenk: false,
};

export const camera = (f: number): Kamera => {
  if (f < SZENEN[0].start) return kalKamera(f);
  for (let i = 0; i < SZENEN.length; i++) {
    const s = SZENEN[i];
    if (f >= s.ende) continue;
    if (f < wachsStart(s)) {
      const ziel = rahmen(stapelXKm(i), 0, s);
      return fahrt(endKamera(i - 1), ziel, (f - s.start) / s.schwenk, true);
    }
    return rahmen(stapelXKm(i), stapelHoeheKm(f, i), s);
  }
  if (f < ZOOM_ENDE) {
    return fahrt(endKamera(SZENEN.length - 1), FINALE_KAMERA, (f - FINALE_START) / (ZOOM_ENDE - FINALE_START), false);
  }
  return FINALE_KAMERA;
};

export const aktiveSzene = (f: number): number =>
  SZENEN.findIndex((s) => f >= s.start && f < s.ende);

// ---------- Projektion ----------
export const zuBild = (cam: Kamera, xKm: number, hKm: number): [number, number] => [
  W / 2 + (xKm - cam.cx) / cam.k,
  H / 2 - (hKm - cam.cy) / cam.k,
];

export type StapelRect = { x: number; basis: number; spitze: number; breite: number; hoehePx: number };

export const stapelRect = (cam: Kamera, xKm: number, hKm: number): StapelRect => {
  const [x, basis] = zuBild(cam, xKm, 0);
  const hoehePx = hKm / cam.k;
  return { x, basis, spitze: basis - hoehePx, breite: STAPEL_BREITE_PX, hoehePx };
};

export const erdeBild = (cam: Kamera) => {
  const [x, y] = zuBild(cam, ERDE_X_KM, ERDE_R_KM);
  return { x, y, r: ERDE_R_KM / cam.k };
};

// Höhenmarker: ausgeblendet, wenn zu dicht an der Grundlinie oder am nächsthöheren Marker.
export const markerLayout = (cam: Kamera) => {
  const [, basis] = zuBild(cam, 0, 0);
  return HOEHENMARKER.map((m, i) => {
    const naechster = HOEHENMARKER[i + 1];
    const dBasis = m.km / cam.k;
    const luecke = naechster ? (naechster.km - m.km) / cam.k : Infinity;
    const deckung = clamp01((dBasis - 12) / 12) * clamp01((luecke - 60) / 30);
    return { ...m, y: basis - dBasis, deckung };
  });
};
