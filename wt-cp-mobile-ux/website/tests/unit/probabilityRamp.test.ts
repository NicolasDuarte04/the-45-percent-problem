import { describe, expect, it } from "vitest";
import {
  probabilityToColor,
  probabilityTextColor,
  probabilityTextColorHex,
  goalMatrixRampColor,
  goalMatrixTextColor,
  relativeLuminance,
  RAMP_LOW,
  RAMP_HIGH,
} from "@/lib/viz/probabilityRamp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLuminance(rgbStr: string): number {
  const m = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) throw new Error(`cannot parse: ${rgbStr}`);
  return relativeLuminance(Number(m[1]), Number(m[2]), Number(m[3]));
}

// ---------------------------------------------------------------------------
// probabilityToColor -- boundary values
// ---------------------------------------------------------------------------

describe("probabilityToColor", () => {
  it("returns a defined rgb() string at p=0", () => {
    const c = probabilityToColor(0);
    expect(c).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("returns a defined rgb() string at p=0.5", () => {
    const c = probabilityToColor(0.5);
    expect(c).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("returns a defined rgb() string at p=1", () => {
    const c = probabilityToColor(1);
    expect(c).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("clamps values below 0 to p=0 output", () => {
    expect(probabilityToColor(-0.1)).toBe(probabilityToColor(0));
  });

  it("clamps values above 1 to p=1 output", () => {
    expect(probabilityToColor(1.5)).toBe(probabilityToColor(1));
  });

  it("low end matches RAMP_LOW palette constant", () => {
    // p=0 should produce exactly the RAMP_LOW color
    expect(probabilityToColor(0)).toBe(`rgb(${parseInt(RAMP_LOW.slice(1, 3), 16)}, ${parseInt(RAMP_LOW.slice(3, 5), 16)}, ${parseInt(RAMP_LOW.slice(5, 7), 16)})`);
  });

  it("high end matches RAMP_HIGH palette constant", () => {
    expect(probabilityToColor(1)).toBe(`rgb(${parseInt(RAMP_HIGH.slice(1, 3), 16)}, ${parseInt(RAMP_HIGH.slice(3, 5), 16)}, ${parseInt(RAMP_HIGH.slice(5, 7), 16)})`);
  });
});

// ---------------------------------------------------------------------------
// Luminance direction property
//
// The ramp palette (shared with the goal matrix) peaks in W3C luminance at
// the coral stop (~p=0.60) and returns to a darker plum at the high end.
// This is intentional: the plum endpoint is visually distinctive via hue and
// saturation, not raw brightness. The text-contrast logic handles readability
// across the full range. We therefore test directional luminance (low recedes,
// mid pops, high is distinct from low) rather than strict step monotonicity.
// ---------------------------------------------------------------------------

describe("probabilityToColor luminance direction", () => {
  it("low-probability cells (0-15%) are darker than mid-range (30%)", () => {
    const lo = parseLuminance(probabilityToColor(0.05));
    const mid = parseLuminance(probabilityToColor(0.30));
    expect(mid).toBeGreaterThan(lo);
  });

  it("mid-range (30%) is darker than the coral-peak region (55%)", () => {
    const mid = parseLuminance(probabilityToColor(0.30));
    const peak = parseLuminance(probabilityToColor(0.55));
    expect(peak).toBeGreaterThan(mid);
  });

  it("the zero-probability cell is the darkest point (background-adjacent)", () => {
    const base = parseLuminance(probabilityToColor(0));
    const sample = parseLuminance(probabilityToColor(0.10));
    expect(base).toBeLessThan(sample);
  });

  it("Spain 78.1% R16 is clearly brighter than Ghana 4.9% group stage", () => {
    const ghana = parseLuminance(probabilityToColor(0.049));
    const spain = parseLuminance(probabilityToColor(0.781));
    expect(spain).toBeGreaterThan(ghana * 5);
  });
});

// ---------------------------------------------------------------------------
// probabilityTextColor -- per-band decisions matching V2-04
// ---------------------------------------------------------------------------

describe("probabilityTextColor", () => {
  it("returns 'light' for empty cells (p=0)", () => {
    expect(probabilityTextColor(0)).toBe("light");
  });

  it("returns 'light' for p < 0.01 (quiet grey band)", () => {
    expect(probabilityTextColor(0.005)).toBe("light");
  });

  it("returns 'light' for p < 0.10 (very faint teal band)", () => {
    expect(probabilityTextColor(0.05)).toBe("light");
  });

  it("Ghana group-stage probability (4.9%) gets light text", () => {
    expect(probabilityTextColorHex(0.049)).toBe("#A8AFBC");
  });

  it("Spain semi-final probability (18.2%) gets appropriate text", () => {
    // In the 0.15-0.30 range (dark cyan band) the luminance is relatively
    // low, so light text (#EEE8DD) should be used.
    expect(probabilityTextColorHex(0.182)).toBe("#EEE8DD");
  });

  it("Spain R16 probability (78.1%) gets dark text (bright cell)", () => {
    // The 0.80 stop (#A87AA4) and beyond are the lightest part of the ramp.
    // Luminance exceeds 0.22 so dark text applies.
    expect(probabilityTextColor(0.781)).toBe("dark");
    expect(probabilityTextColorHex(0.781)).toBe("#0F1216");
  });
});

// ---------------------------------------------------------------------------
// goalMatrixRampColor -- preserves existing goal matrix output
// ---------------------------------------------------------------------------

describe("goalMatrixRampColor", () => {
  it("returns a defined rgb() string at norm=0", () => {
    expect(goalMatrixRampColor(0)).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("returns a defined rgb() string at norm=0.5", () => {
    expect(goalMatrixRampColor(0.5)).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("returns a defined rgb() string at norm=1", () => {
    expect(goalMatrixRampColor(1)).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("low end is RAMP_LOW (#1C222B)", () => {
    expect(goalMatrixRampColor(0)).toBe("rgb(28, 34, 43)");
  });

  it("high end is RAMP_HIGH (#8E5A8A)", () => {
    expect(goalMatrixRampColor(1)).toBe("rgb(142, 90, 138)");
  });

  it("norm=0.25 is the muted-cyan stop (#4F8FA8)", () => {
    expect(goalMatrixRampColor(0.25)).toBe("rgb(79, 143, 168)");
  });

  it("norm=0.60 is the muted-coral stop (#C99878)", () => {
    expect(goalMatrixRampColor(0.6)).toBe("rgb(201, 152, 120)");
  });
});

// ---------------------------------------------------------------------------
// goalMatrixTextColor -- contrast-aware text for the goal matrix
// ---------------------------------------------------------------------------

describe("goalMatrixTextColor", () => {
  it("near-zero norm gets quiet grey", () => {
    expect(goalMatrixTextColor(0.02)).toBe("#A8AFBC");
  });

  it("mid-range norm (coral peak ~0.60) gets dark text", () => {
    // The coral stop #C99878 has high luminance, so dark text applies.
    expect(goalMatrixTextColor(0.6)).toBe("#0F1216");
  });

  it("high norm (1.0, plum) gets light text", () => {
    // #8E5A8A is dark enough to warrant light text.
    expect(goalMatrixTextColor(1.0)).toBe("#EEE8DD");
  });
});
