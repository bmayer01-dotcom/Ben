// Timeline, camera and layout. Pure (no React/Remotion), so the test checks the same code that renders.
// Heights are always to scale (one km-per-pixel value per frame for every stack and Earth);
// horizontal positions are screen layout only (width not to scale).
import { ERDE_DURCHMESSER_KM, PROJEKTE } from "./data.ts";
import { hoeheKm } from "./scale.ts";

export const W = 1080;
export const H = 1350; // 4:5 for the LinkedIn feed
export const FPS = 30;

export const STAPEL_BREITE_PX = 60; // fixed screen width, independent of zoom
export const BASIS_Y = 1180; // ground line on screen
export const SPITZE_Y = 520; // resting height of the tallest stack's top
const L = BASIS_Y - SPITZE_Y;

export const HOEHEN_KM = PROJEKTE.map((p) => hoeheKm(p.kosten_mrd_usd));
export const N = PROJEKTE.length;
export const ERDE_R_KM = ERDE_DURCHMESSER_KM / 2;

// ---------- Timeline ----------
export const INTRO_ENDE = 70;
export const HEADLINE_ENDE = 320;

export type Szene = { id: string; start: number; ende: number; wachsStart: number; wachsEnde: number };
const DAUERN = [150, 115, 115, 115, 125, 230];
const GLEITEN = 16; // the row slides one slot left before the next stack grows
const WACHSEN = [70, 56, 56, 56, 62, 160];
export const SZENEN: Szene[] = (() => {
  let t = HEADLINE_ENDE;
  return PROJEKTE.map((p, i) => {
    const start = t;
    t += DAUERN[i];
    const wachsStart = i === 0 ? start + 20 : start + GLEITEN;
    return { id: p.id, start, ende: t, wachsStart, wachsEnde: wachsStart + WACHSEN[i] };
  });
})();

export const FINALE_START = SZENEN[N - 1].ende; // 870
export const ZOOM_ENDE = FINALE_START + 80;
export const FINALE_ENDE = FINALE_START + 240;
export const CRAWL_START = FINALE_ENDE;
export const SPRUNG = CRAWL_START + 300; // light-speed jump
export const DAUER = SPRUNG + 140; // 1850 frames ≈ 62 s

// ---------- Easing ----------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

// Current stack height in km.
// Burj grows from the ground on a log scale (past the real tower); later stacks grow
// linearly beside the previous one and overtake it. Mag7 accelerates.
export const stapelHoeheKm = (f: number, i: number): number => {
  const s = SZENEN[i];
  const hF = HOEHEN_KM[i];
  if (f < s.wachsStart) return 0;
  if (f >= s.wachsEnde) return hF;
  const t = (f - s.wachsStart) / (s.wachsEnde - s.wachsStart);
  if (i === 0) return logLerp(0.004, hF, easeInOutSine(t));
  if (s.id === "mag7") return hF * (t < 0.85 ? Math.pow(t / 0.85, 2) * 0.9 : 0.9 + 0.1 * easeInOutSine((t - 0.85) / 0.15));
  return hF * easeInOutCubic(t);
};

// ---------- Camera ----------
export type Kamera = { k: number; stapelX: number[]; erdeX: number | null; zoom: number };

const K_START = 0.0014; // at the ground: the 828 m tower fills the frame
const smax = (werte: number[]) => Math.pow(werte.reduce((s, v) => s + Math.pow(v, 8), 0), 1 / 8);

// Height that sets the zoom: smooth maximum of everything already standing.
const rahmenHoehe = (f: number) => {
  const hs = PROJEKTE.map((_, i) => stapelHoeheKm(f, i));
  return smax(hs);
};

const FINALE_MAX_PX = 600;
const FINALE_ERSTER_X = 400;
const FINALE_ABSTAND = 90;
export const K_FINALE = Math.max(...HOEHEN_KM) / FINALE_MAX_PX;

const AKTUELL_X = 600;
const ABSTAND = 120;
const szenenLayout = (c: number) => PROJEKTE.map((_, j) => AKTUELL_X + (j - c) * ABSTAND);
const finaleLayout = PROJEKTE.map((_, j) => FINALE_ERSTER_X + j * FINALE_ABSTAND);
const erdeFinaleX = (k: number) => FINALE_ERSTER_X - STAPEL_BREITE_PX / 2 - 50 - ERDE_R_KM / k;

// Index of the active stack, fractional while the row slides.
const aktuellerSlot = (f: number) => {
  for (let i = N - 1; i >= 1; i--) {
    const s = SZENEN[i];
    if (f >= s.start) return i - 1 + easeInOutCubic((f - s.start) / GLEITEN);
  }
  return 0;
};

const szenenKamera = (f: number): Kamera => {
  const h = rahmenHoehe(f);
  const k = Math.sqrt(K_START ** 2 + (h / L) ** 2);
  return { k, stapelX: szenenLayout(aktuellerSlot(f)), erdeX: null, zoom: 0 };
};

export const camera = (f: number): Kamera => {
  if (f < FINALE_START) return szenenKamera(f);
  const a = szenenKamera(FINALE_START - 1);
  const u = easeInOutCubic((f - FINALE_START) / (ZOOM_ENDE - FINALE_START));
  const k = logLerp(a.k, K_FINALE, u);
  const stapelX = a.stapelX.map((x, j) => lerp(x, finaleLayout[j], u));
  const erdeX = lerp(-ERDE_R_KM / k - 60, erdeFinaleX(k), u);
  return { k, stapelX, erdeX, zoom: u };
};

export const aktiveSzene = (f: number): number => SZENEN.findIndex((s) => f >= s.start && f < s.ende);

// ---------- Projection ----------
export type StapelRect = { x: number; basis: number; spitze: number; breite: number; hoehePx: number };

export const stapelRect = (cam: Kamera, i: number, hKm: number): StapelRect => {
  const hoehePx = hKm / cam.k;
  return { x: cam.stapelX[i], basis: BASIS_Y, spitze: BASIS_Y - hoehePx, breite: STAPEL_BREITE_PX, hoehePx };
};

// Altitude (km) of a screen row
export const hoeheBeiY = (cam: Kamera, y: number) => (BASIS_Y - y) * cam.k;

export const erdeBild = (cam: Kamera) =>
  cam.erdeX === null ? null : { x: cam.erdeX, y: BASIS_Y - ERDE_R_KM / cam.k, r: ERDE_R_KM / cam.k };
