// Source data – do not change values. Sorted by cost, ascending.

export const SCHEIN_MM = 0.10922;

export type Projekt = {
  id: string;
  name: string;
  kosten_mrd_usd: number;
  icon: string;
  kontextzeile: string;
};

export const PROJEKTE: Projekt[] = [
  {
    id: "burj",
    name: "Burj Khalifa",
    kosten_mrd_usd: 1.5,
    icon: "Tower silhouette with stepped spire",
    kontextzeile: "Almost 200× taller than the tower itself – the stack reaches space",
  },
  {
    id: "manhattan",
    name: "Manhattan Project",
    kosten_mrd_usd: 36,
    icon: "Atom symbol (no mushroom cloud)",
    kontextzeile: "Almost 10× the altitude of the ISS",
  },
  {
    id: "iss",
    name: "ISS",
    kosten_mrd_usd: 150,
    icon: "Space station with solar wings",
    kontextzeile: "40× higher than the station itself orbits",
  },
  {
    id: "marshall",
    name: "Marshall Plan",
    kosten_mrd_usd: 170,
    icon: "Construction crane over a row of houses",
    kontextzeile: "Just below the orbit of GPS satellites",
  },
  {
    id: "apollo",
    name: "Apollo Program",
    kosten_mrd_usd: 257,
    icon: "Saturn V rocket",
    kontextzeile: "More than twice as tall as Earth is wide",
  },
  {
    id: "mag7",
    name: "Mag7 Capex 2026",
    kosten_mrd_usd: 780,
    icon: "Server rack with chip",
    kontextzeile: "More than twice around the equator – in a single year",
  },
];

export const ERDE_DURCHMESSER_KM = 12742;
