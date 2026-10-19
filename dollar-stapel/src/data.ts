// Quelldaten – Werte nicht ändern. Aufsteigend nach Kosten sortiert.

export const SCHEIN_MM = 0.10922;

export type Projekt = {
  id: string;
  name: string;
  kosten_mrd_usd: number;
  laufzeit_badge: string;
  icon: string;
  kontextzeile: string;
  kosten_anzeige?: string;
};

export const PROJEKTE: Projekt[] = [
  {
    id: "burj",
    name: "Burj Khalifa",
    kosten_mrd_usd: 1.5,
    laufzeit_badge: "Bau 2004–2010",
    icon: "Turm-Silhouette mit gestaffelter Spitze",
    kontextzeile: "Fast 200-mal höher als der Turm selbst – der Stapel reicht ins All",
  },
  {
    id: "s21",
    name: "Stuttgart 21",
    kosten_mrd_usd: 16.8,
    laufzeit_badge: "seit 2010",
    icon: "Bahnhofsdach mit runden Lichtaugen",
    kontextzeile: "4½-mal so hoch, wie die ISS fliegt",
    kosten_anzeige: "≈ 17 Mrd. $ (14,5 Mrd. €)",
  },
  {
    id: "manhattan",
    name: "Manhattan-Projekt",
    kosten_mrd_usd: 36,
    laufzeit_badge: "1942–1946",
    icon: "Atom-Symbol (keine Pilzwolke)",
    kontextzeile: "Fast 10-mal die Flughöhe der ISS",
  },
  {
    id: "iss",
    name: "ISS",
    kosten_mrd_usd: 150,
    laufzeit_badge: "27 Jahre",
    icon: "Raumstation mit Solarflügeln",
    kontextzeile: "40-mal höher, als die Station selbst fliegt",
  },
  {
    id: "marshall",
    name: "Marshallplan",
    kosten_mrd_usd: 170,
    laufzeit_badge: "1948–1952",
    icon: "Baukran über einer Häuserzeile",
    kontextzeile: "Knapp unter den GPS-Satelliten",
  },
  {
    id: "apollo",
    name: "Apollo-Programm",
    kosten_mrd_usd: 257,
    laufzeit_badge: "1960–1973",
    icon: "Saturn-V-Rakete",
    kontextzeile: "Mehr als doppelt so hoch, wie die Erde dick ist",
  },
  {
    id: "interstate",
    name: "Interstate Highways",
    kosten_mrd_usd: 620,
    laufzeit_badge: "37 Jahre",
    icon: "Autobahnkreuz in Kleeblattform",
    kontextzeile: "Würde 1,7-mal um den Äquator reichen",
  },
  {
    id: "mag7",
    name: "Mag7 Capex 2026",
    kosten_mrd_usd: 780,
    laufzeit_badge: "1 Jahr",
    icon: "Serverrack mit Chip",
    kontextzeile: "Mehr als 2-mal um den Äquator – in einem einzigen Jahr",
  },
];

// `kurz` ist nur die Beschriftung im Bild.
export const HOEHENMARKER = [
  { id: "wolken", name: "Wolken", kurz: "Wolken", km: 10 },
  { id: "karman", name: "Grenze zum All (Kármán-Linie)", kurz: "Kármán-Linie", km: 100 },
  { id: "iss", name: "ISS-Orbit", kurz: "ISS-Orbit", km: 400 },
  { id: "gps", name: "GPS-Satelliten", kurz: "GPS", km: 20200 },
  { id: "geo", name: "Geostationäre Satelliten", kurz: "Geostationär", km: 35786 },
];

export const ERDE_DURCHMESSER_KM = 12742;
