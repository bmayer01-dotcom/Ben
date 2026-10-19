import { test } from "node:test";
import assert from "node:assert/strict";
import { ERDE_DURCHMESSER_KM, HOEHENMARKER, PROJEKTE } from "../src/data.ts";
import { hoeheKm, stackHeightPx } from "../src/scale.ts";
import {
  camera,
  erdeBild,
  FINALE_ENDE,
  H,
  STAPEL_BREITE_PX,
  stapelHoeheKm,
  stapelRect,
  stapelXKm,
  W,
  zuBild,
} from "../src/world.ts";

const LETZTER = FINALE_ENDE - 1; // letzter Frame des Zoom-outs
const cam = camera(LETZTER);
const rects = PROJEKTE.map((_, i) => stapelRect(cam, stapelXKm(i), stapelHoeheKm(LETZTER, i)));
const ref = PROJEKTE.length - 1;

test("Höhenformel aus data.ts", () => {
  assert.ok(Math.abs(hoeheKm(780) - 85191.6) < 1e-6);
  assert.ok(Math.abs(hoeheKm(1.5) - 163.83) < 1e-6);
});

test("Finale: Stapelhöhen im Verhältnis der Kosten (±1 px)", () => {
  PROJEKTE.forEach((p, i) => {
    const soll = (rects[ref].hoehePx * p.kosten_mrd_usd) / PROJEKTE[ref].kosten_mrd_usd;
    assert.ok(Math.abs(rects[i].hoehePx - soll) <= 1, `${p.id}: ${rects[i].hoehePx} vs ${soll}`);
    assert.ok(Math.abs(rects[i].hoehePx - stackHeightPx(p.kosten_mrd_usd, cam.k)) <= 1, p.id);
  });
});

test("Finale: Erde im selben Maßstab (±1 px)", () => {
  const erdePx = erdeBild(cam).r * 2;
  const soll = (rects[ref].hoehePx * ERDE_DURCHMESSER_KM) / hoeheKm(PROJEKTE[ref].kosten_mrd_usd);
  assert.ok(Math.abs(erdePx - soll) <= 1, `${erdePx} vs ${soll}`);
});

test("Finale: Höhenmarker im selben Maßstab (±1 px)", () => {
  for (const m of HOEHENMARKER) {
    const [, y] = zuBild(cam, 0, m.km);
    const soll = (rects[ref].hoehePx * m.km) / hoeheKm(PROJEKTE[ref].kosten_mrd_usd);
    assert.ok(Math.abs(rects[0].basis - y - soll) <= 1, m.id);
  }
});

test("Finale: alle Stapel, Erde und Geo-Linie im Bild, ca. 90 px Abstand", () => {
  for (const r of rects) {
    assert.ok(r.x - r.breite / 2 >= 0 && r.x + r.breite / 2 <= W);
    assert.ok(r.spitze >= 0 && r.basis <= H);
  }
  for (let i = 1; i < rects.length; i++) assert.ok(Math.abs(rects[i].x - rects[i - 1].x - 90) < 0.5);
  const e = erdeBild(cam);
  assert.ok(e.x - e.r >= 0 && e.x + e.r < rects[0].x - STAPEL_BREITE_PX / 2);
  const [, geoY] = zuBild(cam, 0, HOEHENMARKER.find((m) => m.id === "geo")!.km);
  assert.ok(geoY > 0 && geoY < H);
});

test("Breite fest, unabhängig vom Zoom", () => {
  for (const f of [100, 300, 700, 1100, 1300, 1600]) {
    assert.equal(stapelRect(camera(f), 0, 1).breite, STAPEL_BREITE_PX);
  }
});

test("Endcard-Aussage stimmt: Apollo + Manhattan + Marshall + ISS < Mag7", () => {
  const k = (id: string) => PROJEKTE.find((p) => p.id === id)!.kosten_mrd_usd;
  assert.ok(k("apollo") + k("manhattan") + k("marshall") + k("iss") < k("mag7"));
});
