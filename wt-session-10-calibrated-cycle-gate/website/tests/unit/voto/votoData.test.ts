/**
 * Session 08 — unit tests for the voto data contract + sufficiency gating.
 *
 * These exercise the PURE normalizers in `_lib/voto-data.ts` with fixtures
 * shaped like the real 21J snapshots. The filesystem reader (`snapshot-source`)
 * is a thin try/catch wrapper around these, so testing the normalizers covers
 * the parsing + gating logic without touching `fs` or `server-only`.
 */

import { describe, expect, it } from "vitest";
import {
  asSufficiency,
  buildVotoData,
  demoMapa,
  demoModel,
  demoPulso,
  demoVotoData,
  isPreliminary,
  normalizeMapa,
  normalizeModel,
  normalizePulso,
} from "@/app/voto21junio/_lib/voto-data";

// Fixtures mirror the real snapshots on main (2026-06-04 model, demo pulso).
const MODEL_FIXTURE = {
  snapshot_date: "2026-06-04",
  p_cepeda: 0.4637,
  p_espriella: 0.5363,
  share_cepeda: { mean: 0.4959, ci80_low: 0.4267, ci80_high: 0.5654 },
  margin: { mean: 0.818, ci80_low: -13.076, ci80_high: 14.656 },
  n_polls: 12,
  newest_poll_date: "2026-06-02",
  data_sufficiency: "thin",
};

const PULSO_FIXTURE = {
  snapshot_hour: "2026-06-05T20:00:00Z",
  index_value: 73.46,
  inputs_live: 1,
  inputs_total: 5,
  data_sufficiency: "demo",
  readings: [
    { source: "headlines", value: 73.46, available: true },
    { source: "trends", value: null, available: false },
    { source: "market", value: null, available: false },
    { source: "x", value: null, available: false },
    { source: "tiktok", value: null, available: false },
  ],
};

const MAPA_FIXTURE = {
  granularity: "departamento",
  coverage: { municipio_coverage: "0 of ~1100 municipios — departamento fallback" },
  national_margin_source: { data_sufficiency: "thin" },
};

describe("asSufficiency / isPreliminary", () => {
  it("recognises the three known states", () => {
    expect(asSufficiency("ok")).toBe("ok");
    expect(asSufficiency("thin")).toBe("thin");
    expect(asSufficiency("demo")).toBe("demo");
  });
  it("collapses anything unknown to demo (fail safe)", () => {
    expect(asSufficiency(undefined)).toBe("demo");
    expect(asSufficiency("garbage")).toBe("demo");
    expect(asSufficiency(null)).toBe("demo");
  });
  it("treats only ok as non-preliminary", () => {
    expect(isPreliminary("ok")).toBe(false);
    expect(isPreliminary("thin")).toBe(true);
    expect(isPreliminary("demo")).toBe(true);
  });
});

describe("normalizeModel", () => {
  it("maps win-probabilities to whole-percent and carries the margin CI", () => {
    const m = normalizeModel(MODEL_FIXTURE);
    expect(m.pCepeda).toBe(46.4);
    expect(m.pEspriella).toBe(53.6);
    expect(m.marginLoPp).toBe(-13.1);
    expect(m.marginHiPp).toBe(14.7);
    expect(m.sufficiency).toBe("thin");
    expect(m.nPolls).toBe(12);
    expect(m.isFallback).toBe(false);
  });
  it("the margin interval straddles zero for the thin snapshot (no firm winner)", () => {
    const m = normalizeModel(MODEL_FIXTURE);
    expect(m.marginLoPp).toBeLessThan(0);
    expect(m.marginHiPp).toBeGreaterThan(0);
  });
  it("throws when the core probability is missing", () => {
    expect(() => normalizeModel({ data_sufficiency: "ok" })).toThrow();
  });
});

describe("normalizePulso", () => {
  it("rounds the index and flags only the live signal as available", () => {
    const p = normalizePulso(PULSO_FIXTURE);
    expect(p.index).toBe(73);
    expect(p.inputsLive).toBe(1);
    expect(p.inputsTotal).toBe(5);
    expect(p.signals.filter((s) => s.available)).toHaveLength(1);
    expect(p.signals.find((s) => s.nm.includes("Titulares"))?.available).toBe(true);
    expect(p.signals.find((s) => s.nm.includes("TikTok"))?.available).toBe(false);
  });
  it("reports no overnight delta when there is no prior reading", () => {
    expect(normalizePulso(PULSO_FIXTURE).delta).toBeNull();
  });
  it("throws when index_value is absent", () => {
    expect(() => normalizePulso({ readings: [] })).toThrow();
  });
});

describe("normalizeMapa", () => {
  it("carries departamento granularity and never reports ok", () => {
    const m = normalizeMapa(MAPA_FIXTURE);
    expect(m.granularity).toBe("departamento");
    expect(m.sufficiency).toBe("thin");
  });
  it("downgrades an ok national margin source to thin (mapa is indicative only)", () => {
    const m = normalizeMapa({ ...MAPA_FIXTURE, national_margin_source: { data_sufficiency: "ok" } });
    expect(m.sufficiency).toBe("thin");
  });
  it("throws when granularity is missing", () => {
    expect(() => normalizeMapa({})).toThrow();
  });
});

describe("demo fallbacks", () => {
  it("are all flagged isFallback + demo sufficiency", () => {
    for (const d of [demoModel(), demoPulso(), demoMapa()]) {
      expect(d.isFallback).toBe(true);
      expect(d.sufficiency).toBe("demo");
    }
  });
  it("demoVotoData reports anyFallback and a demo stamp", () => {
    const v = demoVotoData();
    expect(v.anyFallback).toBe(true);
    expect(v.stamp).toMatch(/ejemplo/);
  });
});

describe("buildVotoData stamp", () => {
  it("labels a thin model preliminar and uses its real poll count", () => {
    const v = buildVotoData(normalizeModel(MODEL_FIXTURE), normalizePulso(PULSO_FIXTURE), normalizeMapa(MAPA_FIXTURE));
    expect(v.stamp).toContain("preliminar");
    expect(v.stamp).toContain("2026-06-04");
    expect(v.encuestasCount).toBe(12);
    expect(v.anyFallback).toBe(false);
  });
  it("labels an ok model en vivo", () => {
    const okModel = normalizeModel({ ...MODEL_FIXTURE, data_sufficiency: "ok" });
    const v = buildVotoData(okModel, normalizePulso(PULSO_FIXTURE), normalizeMapa(MAPA_FIXTURE));
    expect(v.stamp).toContain("en vivo");
  });
});
