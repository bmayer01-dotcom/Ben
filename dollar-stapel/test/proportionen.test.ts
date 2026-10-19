import { test } from "node:test";
import assert from "node:assert/strict";
import { ERDE_DURCHMESSER_KM, PROJEKTE } from "../src/data.ts";
import { hoeheKm, stackHeightPx } from "../src/scale.ts";
import { camera, erdeBild, FINALE_ENDE, H, STAPEL_BREITE_PX, stapelHoeheKm, stapelRect, SZENEN, W } from "../src/world.ts";

const LETZTER = FINALE_ENDE - 1; // last frame of the zoom-out finale
const cam = camera(LETZTER);
const rects = PROJEKTE.map((_, i) => stapelRect(cam, i, stapelHoeheKm(LETZTER, i)));
const ref = PROJEKTE.length - 1;

test("height formula from data.ts", () => {
  assert.ok(Math.abs(hoeheKm(780) - 85191.6) < 1e-6);
  assert.ok(Math.abs(hoeheKm(1.5) - 163.83) < 1e-6);
});

test("finale: stack heights in proportion to cost (±1 px)", () => {
  PROJEKTE.forEach((p, i) => {
    const soll = (rects[ref].hoehePx * p.kosten_mrd_usd) / PROJEKTE[ref].kosten_mrd_usd;
    assert.ok(Math.abs(rects[i].hoehePx - soll) <= 1, `${p.id}: ${rects[i].hoehePx} vs ${soll}`);
    assert.ok(Math.abs(rects[i].hoehePx - stackHeightPx(p.kosten_mrd_usd, cam.k)) <= 1, p.id);
  });
});

test("finale: Earth at the same scale (±1 px)", () => {
  const e = erdeBild(cam)!;
  const soll = (rects[ref].hoehePx * ERDE_DURCHMESSER_KM) / hoeheKm(PROJEKTE[ref].kosten_mrd_usd);
  assert.ok(Math.abs(e.r * 2 - soll) <= 1, `${e.r * 2} vs ${soll}`);
});

test("finale: all stacks and Earth in frame, about 90 px apart", () => {
  for (const r of rects) {
    assert.ok(r.x - r.breite / 2 >= 0 && r.x + r.breite / 2 <= W);
    assert.ok(r.spitze >= 0 && r.basis <= H);
  }
  for (let i = 1; i < rects.length; i++) assert.ok(Math.abs(rects[i].x - rects[i - 1].x - 90) < 0.5);
  const e = erdeBild(cam)!;
  assert.ok(e.x - e.r >= 0 && e.x + e.r < rects[0].x - STAPEL_BREITE_PX / 2);
});

test("every frame: one scale for all stacks, fixed width", () => {
  for (let f = 0; f < FINALE_ENDE; f += 7) {
    const c = camera(f);
    PROJEKTE.forEach((p, i) => {
      const r = stapelRect(c, i, stapelHoeheKm(f, i));
      assert.equal(r.breite, STAPEL_BREITE_PX);
      assert.ok(Math.abs(r.hoehePx - stapelHoeheKm(f, i) / c.k) < 1e-9);
    });
  }
});

test("camera zoom is continuous across scene changes", () => {
  for (const s of SZENEN) {
    const a = camera(s.start - 1).k;
    const b = camera(s.start).k;
    assert.ok(Math.abs(b / a - 1) < 0.02, `${s.id}: ${a} → ${b}`);
  }
});

test("closing claim holds: Apollo + Manhattan + Marshall + ISS < Mag7", () => {
  const k = (id: string) => PROJEKTE.find((p) => p.id === id)!.kosten_mrd_usd;
  assert.ok(k("apollo") + k("manhattan") + k("marshall") + k("iss") < k("mag7"));
});
