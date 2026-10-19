// Erzeugt public/musik.wav: steigende, weltraumartige Elektronik, 60 s, prozedural (keine Samples).
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const DAUER = 60;
const N = SR * DAUER;
const L = new Float32Array(N);
const R = new Float32Array(N);

const BPM = 120;
const BEAT = 60 / BPM;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, t) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Dm – Bb – F – C, je 2 Takte
const AKKORDE = [
  { pad: [50, 53, 57, 62], bass: 38, arp: [62, 65, 69, 74] },
  { pad: [46, 50, 53, 58], bass: 34, arp: [58, 62, 65, 70] },
  { pad: [45, 48, 53, 57], bass: 41, arp: [60, 65, 69, 72] },
  { pad: [43, 48, 52, 55], bass: 36, arp: [60, 64, 67, 72] },
];
const akkordBei = (t) => (t >= 55 ? AKKORDE[0] : AKKORDE[Math.floor(t / (BEAT * 8)) % 4]);

// Gesamtintensität: steigt bis zum Mag7-Höhepunkt (~46 s), Endcard ruhig.
const intens = (t) => 0.25 + 0.35 * smooth(3, 38, t) + 0.4 * smooth(38, 46, t) - 0.55 * smooth(54.5, 57, t);

// State-variable-Tiefpass
const tiefpass = () => {
  let lo = 0, band = 0;
  return (x, fc, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    lo += f * band;
    const hi = x - lo - q * band;
    band += f * hi;
    return lo;
  };
};

// ---------- Pad (verstimmte Sägezähne) ----------
{
  const stimmen = [];
  for (let n = 0; n < 4; n++) for (const d of [-0.12, 0, 0.11]) stimmen.push({ n, d, ph: rnd(), pan: d === 0 ? 0.5 : d < 0 ? 0.2 : 0.8 });
  const fl = tiefpass(), fr = tiefpass();
  let glatt = AKKORDE[0].pad.map(mtof);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ziel = akkordBei(t).pad.map(mtof);
    glatt = glatt.map((g, j) => g + (ziel[j] - g) * 0.0004);
    let l = 0, r = 0;
    for (const s of stimmen) {
      s.ph += (glatt[s.n] * Math.pow(2, s.d / 12)) / SR;
      s.ph -= Math.floor(s.ph);
      const v = 2 * s.ph - 1;
      l += v * (1 - s.pan);
      r += v * s.pan;
    }
    const fc = 250 + 3200 * Math.pow(intens(t), 2) + 300 * Math.sin(t * 0.7);
    const amp = 0.05 * smooth(0, 2.5, t) * (0.6 + 0.4 * intens(t)) * (1 - smooth(58, 60, t));
    L[i] += fl(l, fc) * amp;
    R[i] += fr(r, fc) * amp;
  }
}

// ---------- Sub-Bass, ab 8 s pulsierend ----------
{
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (t < 3) continue;
    ph += mtof(akkordBei(t).bass) / SR;
    const achtel = (t / (BEAT / 2)) % 1;
    const puls = t < 8 ? 0.6 : Math.exp(-achtel * 3.5);
    const amp = 0.16 * smooth(3, 8, t) * puls * (0.5 + 0.5 * intens(t)) * (1 - smooth(55, 58, t));
    const v = Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph);
    L[i] += v * amp;
    R[i] += v * amp;
  }
}

// ---------- Arpeggio (16tel) mit Ping-Pong-Delay ----------
{
  const al = new Float32Array(N), ar = new Float32Array(N);
  const SECHZEHNTEL = BEAT / 4;
  const muster = [0, 1, 2, 3, 2, 1, 2, 3];
  const f = tiefpass();
  for (let s = Math.floor(8 / SECHZEHNTEL); s * SECHZEHNTEL < 56; s++) {
    const t0 = s * SECHZEHNTEL;
    const a = akkordBei(t0);
    const oktave = t0 > 38 ? 12 : 0;
    const freq = mtof(a.arp[muster[s % 8]] + oktave);
    const i0 = Math.floor(t0 * SR);
    const len = Math.floor(0.22 * SR);
    const amp = 0.05 * smooth(8, 16, t0) * (0.4 + 0.6 * intens(t0));
    let ph = 0;
    for (let j = 0; j < len && i0 + j < N; j++) {
      ph += freq / SR;
      const sq = (ph % 1) < 0.5 ? 1 : -1;
      const v = (0.6 * sq + 0.4 * Math.sin(2 * Math.PI * ph)) * Math.exp(-j / (0.06 * SR)) * amp;
      al[i0 + j] += v;
    }
  }
  const D = Math.floor(BEAT * 0.75 * SR);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const x = f(al[i], 1200 + 4000 * intens(t));
    // Ping-Pong: links speist rechts, rechts speist links
    al[i] = x + (i >= D ? ar[i - D] * 0.45 : 0);
    ar[i] = i >= D ? al[i - D] * 0.45 : 0;
    L[i] += al[i];
    R[i] += x * 0.6 + ar[i];
  }
}

// ---------- Kick, 24–54 s ----------
for (let b = Math.ceil(24 / BEAT); b * BEAT < 54.5; b++) {
  const t0 = b * BEAT;
  const i0 = Math.floor(t0 * SR);
  const amp = 0.28 * smooth(24, 30, t0) * (0.6 + 0.4 * intens(t0));
  let ph = 0;
  for (let j = 0; j < 0.35 * SR && i0 + j < N; j++) {
    const tt = j / SR;
    ph += (45 + 90 * Math.exp(-tt * 30)) / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-tt * 9) * amp;
    L[i0 + j] += v;
    R[i0 + j] += v;
  }
}

// ---------- Rauschen-Riser bis zum Höhepunkt ----------
{
  const fl = tiefpass(), fr = tiefpass();
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const steig = smooth(30, 46, t) * (1 - smooth(46, 47.5, t)) + 0.25 * smooth(4, 7.8, t) * (1 - smooth(7.8, 8.4, t));
    if (steig <= 0) continue;
    const fc = 300 + 7000 * steig * steig;
    L[i] += fl(rnd() * 2 - 1, fc, 0.3) * 0.08 * steig;
    R[i] += fr(rnd() * 2 - 1, fc, 0.3) * 0.08 * steig;
  }
}

// ---------- Glöckchen („Sterne“) ----------
{
  const toene = [74, 77, 81, 86, 89, 93];
  for (let t0 = 4; t0 < 59; t0 += 0.5 + rnd() * 1.5) {
    const freq = mtof(toene[Math.floor(rnd() * toene.length)]);
    const pan = rnd();
    const i0 = Math.floor(t0 * SR);
    const amp = 0.025 * (0.5 + intens(t0));
    for (let j = 0; j < 2.5 * SR && i0 + j < N; j++) {
      const tt = j / SR;
      const v = (Math.sin(2 * Math.PI * freq * tt) + 0.3 * Math.sin(2 * Math.PI * freq * 2.76 * tt)) * Math.exp(-tt * 2.2) * amp;
      L[i0 + j] += v * (1 - pan);
      R[i0 + j] += v * pan;
    }
  }
}

// ---------- Normalisieren, sanft begrenzen, WAV schreiben ----------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = 0.9 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fadeOut = 1 - smooth(DAUER - 1.5, DAUER, i / SR);
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * gain * 1.1) * fadeOut * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * gain * 1.1) * fadeOut * 32000), 46 + i * 4);
}
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/musik.wav", import.meta.url), buf);
console.log("public/musik.wav geschrieben");
