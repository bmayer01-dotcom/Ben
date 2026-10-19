// Closing: a calm, slightly tilted text crawl, then a jump to light speed that resolves on the final line.
import React from "react";
import { AbsoluteFill } from "remotion";
import { DS, grotesk, inter } from "./design.ts";
import { clamp01, expoOut, prog } from "./ui.tsx";
import { CRAWL_START, DAUER, H, SPRUNG, W } from "./world.ts";

const zufall = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const STERNE = (() => {
  const r = zufall(11);
  return Array.from({ length: 180 }, () => ({ w: r() * Math.PI * 2, r0: 30 + Math.pow(r(), 0.7) * 820, gr: 0.8 + r() * 1.6, a: 0.25 + r() * 0.7 }));
})();
const MX = W / 2;
const MY = 560;

const Sternenfeld: React.FC<{ f: number }> = ({ f }) => {
  // speed: gentle drift during the crawl, exponential burst at the jump
  const s = prog(f, SPRUNG - 24, 34);
  const tempo = Math.pow(s, 3);
  const nach = prog(f, SPRUNG + 10, 30);
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      {STERNE.map((st, i) => {
        const drift = 1 + (f - CRAWL_START) * 0.0012;
        const r = st.r0 * drift * (1 + 6 * tempo);
        const zug = Math.min(r * 0.92, 40 + 1400 * tempo) * tempo;
        const x2 = MX + Math.cos(st.w) * r;
        const y2 = MY + Math.sin(st.w) * r;
        const x1 = MX + Math.cos(st.w) * (r - zug);
        const y1 = MY + Math.sin(st.w) * (r - zug);
        const o = st.a * (1 - nach * 0.85);
        return zug > 1.5 ? (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? DS.primary : DS.foreground} strokeWidth={st.gr} strokeLinecap="round" opacity={o} />
        ) : (
          <circle key={i} cx={x2} cy={y2} r={st.gr * 0.8} fill={DS.foreground} opacity={o} />
        );
      })}
    </svg>
  );
};

const ABSATZ: { text: string; hervor?: boolean }[][] = [
  [{ text: "The Manhattan Project, the ISS, the Marshall Plan, and Apollo rank among humanity’s most ambitious undertakings." }],
  [{ text: "In 2026, seven companies are spending " }, { text: "more on AI than those four combined.", hervor: true }],
];

export const Crawl: React.FC<{ f: number }> = ({ f }) => {
  const ein = prog(f, CRAWL_START, 16);
  if (ein <= 0) return null;
  const t = f - CRAWL_START;
  // slow scroll; at the jump the text rushes away into the distance
  const sprung = Math.pow(prog(f, SPRUNG - 20, 26), 2);
  const y = 760 - t * 4.2 - sprung * 1600;
  const blitz = Math.sin(Math.PI * prog(f, SPRUNG - 2, 22));
  const schluss = expoOut(prog(f, SPRUNG + 8, 30));
  const fussnote = prog(f, SPRUNG + 40, 16);
  return (
    <AbsoluteFill style={{ background: DS.background, opacity: ein }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="crawlglow" cx="0.5" cy="1" r="0.8">
            <stop offset="0" stopColor={DS.primary} stopOpacity="0.22" />
            <stop offset="1" stopColor={DS.primary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#crawlglow)" opacity={1 - schluss * 0.5} />
      </svg>
      <Sternenfeld f={f} />
      {/* crawl: moderate tilt, fades out toward the top */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1100,
          perspectiveOrigin: "50% 35%",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 4%, black 34%, black 100%)",
          maskImage: "linear-gradient(to bottom, transparent 4%, black 34%, black 100%)",
          opacity: 1 - prog(f, SPRUNG - 4, 10),
        }}
      >
        <div style={{ position: "absolute", left: 90, right: 90, top: 0, transformOrigin: "50% 100%", transform: `rotateX(16deg) translateY(${y}px)`, filter: sprung > 0 ? `blur(${sprung * 8}px)` : undefined }}>
          {ABSATZ.map((teile, i) => (
            <p key={i} style={{ margin: "0 0 56px", textAlign: "center", fontFamily: grotesk, fontWeight: 600, fontSize: 62, lineHeight: "80px", color: DS.foreground, letterSpacing: "-0.005em" }}>
              {teile.map((teil, j) => (
                <span key={j} style={teil.hervor ? { color: DS.primary, textShadow: "0 0 30px rgba(76,214,118,0.45)" } : undefined}>
                  {teil.text}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
      {/* light-speed flash */}
      {blitz > 0 ? <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${(MY / H) * 100}%, rgba(255,255,255,${0.95 * blitz}) 0%, rgba(76,214,118,${0.55 * blitz}) 35%, rgba(6,10,8,0) 75%)` }} /> : null}
      {/* final line */}
      {schluss > 0 ? (
        <div style={{ position: "absolute", left: 60, right: 60, top: 470, textAlign: "center", opacity: schluss, transform: `scale(${1.25 - 0.25 * schluss})`, filter: `blur(${(1 - schluss) * 16}px)` }}>
          <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 92, lineHeight: "102px", letterSpacing: "-0.03em", color: DS.foreground }}>
            The sheer scale is <span style={{ color: DS.primary, textShadow: "0 0 50px rgba(76,214,118,0.55)" }}>unprecedented.</span>
          </div>
        </div>
      ) : null}
      {fussnote > 0 ? (
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 60, textAlign: "center", fontFamily: inter, fontSize: 36, lineHeight: "46px", color: DS.muted, opacity: fussnote * clamp01((DAUER - f) / 4) }}>
          Heights to scale, widths not. Costs adjusted for inflation; Burj Khalifa nominal. Mag7: 2026 capex guidance incl. non-AI spending. One $1 bill: 0.109 mm.
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
