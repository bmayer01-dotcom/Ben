// Stilisierte 1-Dollar-Note: Papier, Guilloche, Rahmen, leeres Oval. Kein Porträt, keine Seriennummer, kein Siegel.
import React from "react";

export const SCHEIN_W = 600;
export const SCHEIN_H = 254; // Seitenverhältnis 156 × 66 mm

const TINTE = "#2F4A3A";
const TINTE_HELL = "#5E7D66";

// Spirograph-Rosette als Pfad
const rosette = (cx: number, cy: number, R: number, a: number, k: number, phase: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2;
    const r = R + a * Math.cos(k * t + phase);
    pts.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};

// Wellenband entlang einer Linie
const welle = (x0: number, x1: number, y: number, amp: number, freq: number, phase: number) => {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 3) pts.push(`${x},${(y + amp * Math.sin(x * freq + phase)).toFixed(1)}`);
  return `M${pts.join("L")}`;
};

const ROSETTEN = [0, 1, 2, 3, 4, 5].map((i) => i * 0.5);
const ECKEN: [number, number][] = [
  [62, 62],
  [538, 62],
  [62, 192],
  [538, 192],
];

const ScheinInhalt: React.FC<{ id: string; fontFamily: string }> = ({ id, fontFamily }) => (
  <>
    <defs>
      <linearGradient id={`${id}-papier`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E9EEDF" />
        <stop offset="1" stopColor="#D2DBC6" />
      </linearGradient>
      <filter id={`${id}-faser`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.29  0 0 0 0 0.23  0 0 0 0.12 0" result="f" />
        <feComposite in="f" in2="SourceGraphic" operator="in" />
      </filter>
    </defs>
    <rect x={0} y={0} width={SCHEIN_W} height={SCHEIN_H} rx={8} fill={`url(#${id}-papier)`} />
    <rect x={0} y={0} width={SCHEIN_W} height={SCHEIN_H} rx={8} fill="#000" filter={`url(#${id}-faser)`} />
    {/* Bordüre aus Wellen */}
    <g fill="none" stroke={TINTE_HELL} strokeWidth={0.9} opacity={0.8}>
      {[0, 1.2, 2.4].map((p) => (
        <React.Fragment key={p}>
          <path d={welle(20, 580, 24, 4, 0.18, p)} />
          <path d={welle(20, 580, 230, 4, 0.18, p)} />
        </React.Fragment>
      ))}
    </g>
    <rect x={14} y={14} width={572} height={226} rx={5} fill="none" stroke={TINTE} strokeWidth={2.5} />
    <rect x={34} y={34} width={532} height={186} rx={3} fill="none" stroke={TINTE} strokeWidth={1.2} />
    {/* Schraffur der Seitenfelder */}
    <g stroke={TINTE_HELL} strokeWidth={0.7} opacity={0.55}>
      {Array.from({ length: 40 }, (_, i) => (
        <React.Fragment key={i}>
          <line x1={100 + i * 2.2} y1={40} x2={100 + i * 2.2} y2={214} />
          <line x1={414 + i * 2.2} y1={40} x2={414 + i * 2.2} y2={214} />
        </React.Fragment>
      ))}
    </g>
    {/* Eck-Rosetten mit Ziffer */}
    {ECKEN.map(([cx, cy], j) => (
      <g key={j}>
        <g fill="none" stroke={TINTE} strokeWidth={0.8} opacity={0.85}>
          {ROSETTEN.map((p) => (
            <path key={p} d={rosette(cx, cy, 24, 6, 12, p)} />
          ))}
        </g>
        <circle cx={cx} cy={cy} r={17} fill="#E3E9D9" stroke={TINTE} strokeWidth={1.2} />
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={26} fontWeight={700} fill={TINTE} fontFamily={fontFamily}>
          1
        </text>
      </g>
    ))}
    {/* Mittelfeld: Oval mit Linienstich, leer */}
    <g fill="none" stroke={TINTE} strokeWidth={0.8}>
      {Array.from({ length: 9 }, (_, i) => (
        <ellipse key={i} cx={300} cy={124} rx={58 + i * 1.6} ry={74 + i * 1.6} opacity={0.35 + i * 0.07} />
      ))}
    </g>
    <ellipse cx={300} cy={124} rx={56} ry={72} fill="#DCE4D2" />
    <g fill="none" stroke={TINTE_HELL} strokeWidth={0.6} opacity={0.5}>
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx={300} cy={124} rx={8 + i * 4} ry={11 + i * 5} />
      ))}
    </g>
    <text x={300} y={218} textAnchor="middle" fontSize={22} fontWeight={700} letterSpacing={8} fill={TINTE} fontFamily={fontFamily}>
      ONE DOLLAR
    </text>
  </>
);

// Draufsicht in Schrägprojektion: Scheinebene auf Parallelogramm abgebildet.
// (x0, y0) = vordere linke Ecke; Tiefe zeigt nach hinten rechts oben.
export const TIEFE_X = 76;
export const TIEFE_Y = -114;

export const ScheinOben: React.FC<{ id: string; fontFamily: string; x0: number; y0: number; drehung?: number; deckung?: number }> = ({
  id,
  fontFamily,
  x0,
  y0,
  drehung = 0,
  deckung = 1,
}) => {
  const mx = x0 + SCHEIN_W / 2 + TIEFE_X / 2;
  const my = y0 + TIEFE_Y / 2;
  return (
    <g opacity={deckung} transform={`rotate(${drehung} ${mx} ${my})`}>
      <g transform={`matrix(1 0 ${-TIEFE_X / SCHEIN_H} ${-TIEFE_Y / SCHEIN_H} ${x0 + TIEFE_X} ${y0 + TIEFE_Y})`}>
        <ScheinInhalt id={id} fontFamily={fontFamily} />
      </g>
    </g>
  );
};
