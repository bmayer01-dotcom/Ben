import { SCHEIN_MM } from "./data.ts";

// hoehe_km = kosten_mrd_usd × 1e9 × SCHEIN_MM / 1e6
export const hoeheKm = (kostenMrd: number): number =>
  (kostenMrd * 1e9 * SCHEIN_MM) / 1e6;

export const stackHeightPx = (kostenMrd: number, kmProPx: number): number =>
  hoeheKm(kostenMrd) / kmProPx;

export const scheineKm = (anzahl: number): number => (anzahl * SCHEIN_MM) / 1e6;

const sig3 = new Intl.NumberFormat("de-DE", { maximumSignificantDigits: 3 });
const mrd = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const ganz = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const NBSP = " ";

const runde3 = (x: number) => Number(x.toPrecision(3));

// Höhe mit 3 signifikanten Stellen, Einheit passend gewählt.
export const formatHoehe = (km: number): string => {
  const m = km * 1000;
  if (runde3(m * 100) < 1) return `${sig3.format(m * 1000)}${NBSP}mm`;
  if (runde3(m) < 1) {
    return runde3(m * 100) < 10
      ? `${sig3.format(m * 1000)}${NBSP}mm`
      : `${sig3.format(m * 100)}${NBSP}cm`;
  }
  if (runde3(m) < 1000) return `${sig3.format(m)}${NBSP}m`;
  return `${sig3.format(km)}${NBSP}km`;
};

export const formatKm = (km: number): string => `${ganz.format(km)}${NBSP}km`;

export const formatMrd = (x: number): string => `${mrd.format(x)}${NBSP}Mrd.${NBSP}$`;
