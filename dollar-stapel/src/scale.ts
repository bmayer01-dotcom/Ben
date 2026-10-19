import { SCHEIN_MM } from "./data.ts";

// hoehe_km = kosten_mrd_usd × 1e9 × SCHEIN_MM / 1e6
export const hoeheKm = (kostenMrd: number): number =>
  (kostenMrd * 1e9 * SCHEIN_MM) / 1e6;

export const stackHeightPx = (kostenMrd: number, kmProPx: number): number =>
  hoeheKm(kostenMrd) / kmProPx;

export const scheineKm = (anzahl: number): number => (anzahl * SCHEIN_MM) / 1e6;

const sig3 = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 });
const bn = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const NBSP = " ";
const runde3 = (x: number) => Number(x.toPrecision(3));

// Height with 3 significant digits, unit chosen to fit.
export const formatHoehe = (km: number): string => {
  const m = km * 1000;
  if (runde3(m) < 0.01) return `${sig3.format(m * 1000)}${NBSP}mm`;
  if (runde3(m) < 1) return `${sig3.format(m * 100)}${NBSP}cm`;
  if (runde3(m) < 1000) return `${sig3.format(m)}${NBSP}m`;
  return `${sig3.format(km)}${NBSP}km`;
};

// "$1.5B", "$780B"
export const formatMrd = (x: number): string => `$${bn.format(x)}B`;
