// mAI-Consult-Designsystem: Tokens der Website (dunkel) + helle Variante für den Himmel am Boden.
import { loadFont as ladeInter } from "@remotion/google-fonts/Inter";
import { loadFont as ladeGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as ladeMono } from "@remotion/google-fonts/JetBrainsMono";

export const inter = ladeInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const grotesk = ladeGrotesk("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const mono = ladeMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const DS = {
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

export const RAND = 60; // Textabstand oben/unten im 4:5-Format
