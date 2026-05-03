import {
  scanContent,
  isSimulatorSurface,
  RULE_TABLES,
} from "../../../scripts/check-forbidden-words.mjs";
import { describe, expect, it } from "vitest";

interface Violation {
  rule: string;
  label: string;
  relPath: string;
  lines: number[];
  excerpt?: string;
}

const NON_SIM_FILE = "src/components/email/SomeNewsletter.tsx";
const SIM_COMPONENT_FILE = "src/components/simulator/Reveal.tsx";
const SIM_LIB_FILE = "src/lib/sim/types.ts";
const VAULT_MDX_FILE = "src/app/(editorial)/vault/methodology/page.mdx";

function rules(violations: Violation[]): string[] {
  return violations.map((v) => `${v.rule}:${v.label}`);
}

describe("check-forbidden-words: documented false-positive immunity", () => {
  // The cautionary tale: these were the offenders that motivated the
  // multi-word-phrase design. They MUST continue to pass.

  it("allows '5% longshot' anywhere — it is a Blueprint Kelly term", () => {
    const v: Violation[] = scanContent(
      "src/app/(quant)/terminal/page.tsx",
      'ε is the pre-registered edge threshold (3% mainline / 5% longshot).',
    );
    expect(v).toEqual([]);
  });

  it("allows the TypeScript Pick<T> utility type", () => {
    const v: Violation[] = scanContent(
      "src/components/ui/popover.tsx",
      'Pick<PopoverPrimitive.Positioner.Props, "align" | "side">',
    );
    expect(v).toEqual([]);
  });

  it("allows JSDoc 'Returns the directory ...'", () => {
    const v: Violation[] = scanContent(
      "src/lib/data/loadSnapshot.ts",
      "/** Returns the directory for a given snapshotId. */\nexport function getSnapshotDir() {}",
    );
    expect(v).toEqual([]);
  });

  it("allows the third-person-singular verb 'picks' inside a code comment", () => {
    const v: Violation[] = scanContent(
      SIM_LIB_FILE,
      "// Once the user picks 'L', no later stage may be set.",
    );
    expect(v).toEqual([]);
  });

  it("allows 'lock the door', 'play around', and other innocent uses of single English words", () => {
    const v: Violation[] = scanContent(
      NON_SIM_FILE,
      "We lock the door, play around with options, and predict the weather.",
    );
    expect(v).toEqual([]);
  });

  it("allows the noun 'prediction' anywhere", () => {
    const v: Violation[] = scanContent(
      NON_SIM_FILE,
      "Confirm tracking for prediction #45A-2026-KZ8X.",
    );
    expect(v).toEqual([]);
  });

  it("allows the verb 'predict' bare (no collocation), even in vault essays", () => {
    const v: Violation[] = scanContent(
      VAULT_MDX_FILE,
      "We predict probability distributions, not winners.",
    );
    expect(v).toEqual([]);
  });
});

describe("check-forbidden-words: §6.6 original-nine phrases (regression)", () => {
  it.each([
    "bet on",
    "place a bet",
    "wager",
    "betting tip",
    "hot tip",
    "value bet",
    "best bet",
    "guaranteed",
    "sure thing",
    "pick a winner",
  ])("rejects %s globally", (phrase) => {
    const v: Violation[] = scanContent(NON_SIM_FILE, `the ${phrase} is here`);
    expect(rules(v)).toContain(`FORBIDDEN-PHRASE:${phrase}`);
  });
});

describe("check-forbidden-words: Path A multi-word phrase additions", () => {
  it.each([
    "moneyline",
    "parlay",
    "payout",
    "lock of the day",
    "lock in",
    "lock it in",
    "pick of the day",
    "pick to win",
    "your picks",
    "make your picks",
    "tip of the day",
    "predict the winner",
    "predict the score",
    "hot streak",
    "cold streak",
    "beat the house",
    "beat the book",
    "beat the model",
    "send it",
    "expected returns",
    "guaranteed returns",
    "pure profit",
    "quick profit",
  ])("rejects %s globally — even in editorial copy", (phrase) => {
    const v: Violation[] = scanContent(NON_SIM_FILE, `text ${phrase} more text`);
    expect(rules(v)).toContain(`FORBIDDEN-PHRASE:${phrase}`);
  });

  it("rejects 'your picks' even inside a simulator surface — global means global", () => {
    const v: Violation[] = scanContent(
      SIM_COMPONENT_FILE,
      "Tap to confirm your picks.",
    );
    expect(rules(v)).toContain("FORBIDDEN-PHRASE:your picks");
  });

  it("rejects 'moneyline' inside a simulator surface — global means global", () => {
    const v: Violation[] = scanContent(
      SIM_COMPONENT_FILE,
      "do not show the moneyline",
    );
    expect(rules(v)).toContain("FORBIDDEN-PHRASE:moneyline");
  });

  it("is case-insensitive (matches 'Lock Of The Day')", () => {
    const v: Violation[] = scanContent(NON_SIM_FILE, "Lock Of The Day promo");
    expect(rules(v)).toContain("FORBIDDEN-PHRASE:lock of the day");
  });

  it("reports all matching line numbers for repeated phrases", () => {
    const v: Violation[] = scanContent(
      NON_SIM_FILE,
      "the moneyline\nsome text\nthe moneyline again",
    );
    const moneyline = v.find((x) => x.label === "moneyline");
    expect(moneyline?.lines).toEqual([1, 3]);
  });
});

describe("check-forbidden-words: dormant simulator-allowlist scaffolding", () => {
  // EMAIL_SYSTEM_FORBIDDEN_REGEX is intentionally empty (see the script's
  // header comment about the false-positive dry-run). These tests verify
  // the surface-detection plumbing is alive and correct so that when a
  // tighter rule is added, the carve-out works without code changes.

  it("isSimulatorSurface true for src/app/(simulator)/", () => {
    expect(isSimulatorSurface("src/app/(simulator)/scenario/page.tsx")).toBe(true);
  });

  it("isSimulatorSurface true for src/components/simulator/", () => {
    expect(isSimulatorSurface("src/components/simulator/Reveal.tsx")).toBe(true);
  });

  it("isSimulatorSurface true for src/lib/sim/", () => {
    expect(isSimulatorSurface("src/lib/sim/types.ts")).toBe(true);
  });

  it("isSimulatorSurface true for the named PredictionVerificationEmail.tsx", () => {
    expect(isSimulatorSurface("src/emails/PredictionVerificationEmail.tsx")).toBe(true);
  });

  it("isSimulatorSurface true for the reserved Phase B email templates", () => {
    expect(isSimulatorSurface("src/emails/PredictionDeadEmail.tsx")).toBe(true);
    expect(isSimulatorSurface("src/emails/PredictionPromotedEmail.tsx")).toBe(true);
  });

  it("isSimulatorSurface false for the daily-brief verification email", () => {
    expect(isSimulatorSurface("src/emails/VerificationEmail.tsx")).toBe(false);
  });

  it("isSimulatorSurface false for editorial vault essays", () => {
    expect(isSimulatorSurface("src/app/(editorial)/vault/methodology/page.mdx")).toBe(false);
  });

  it("isSimulatorSurface false for shared lib files (e.g. lib/email)", () => {
    expect(isSimulatorSurface("src/lib/email/subscribeService.ts")).toBe(false);
  });

  it("RULE_TABLES exposes both regex tables (currently empty by design)", () => {
    expect(Array.isArray(RULE_TABLES.GLOBAL_FORBIDDEN_REGEX)).toBe(true);
    expect(RULE_TABLES.GLOBAL_FORBIDDEN_REGEX).toHaveLength(0);
    expect(Array.isArray(RULE_TABLES.EMAIL_SYSTEM_FORBIDDEN_REGEX)).toBe(true);
    expect(RULE_TABLES.EMAIL_SYSTEM_FORBIDDEN_REGEX).toHaveLength(0);
  });

  it("SIMULATOR_SURFACES is non-empty (scaffolding intact)", () => {
    expect(RULE_TABLES.SIMULATOR_SURFACES.length).toBeGreaterThan(0);
  });
});

describe("check-forbidden-words: exclamation-mark detector (regression)", () => {
  it("flags ! in JSX text content", () => {
    const v: Violation[] = scanContent(
      "src/components/X.tsx",
      "<p>Hello world!</p>",
    );
    expect(v.some((x) => x.rule === "FORBIDDEN-EXCL")).toBe(true);
  });

  it("flags ! inside aria-label attribute value", () => {
    const v: Violation[] = scanContent(
      "src/components/X.tsx",
      '<button aria-label="Submit now!" />',
    );
    expect(v.some((x) => x.rule === "FORBIDDEN-EXCL")).toBe(true);
  });

  it("does NOT flag ! in TypeScript operators", () => {
    const v: Violation[] = scanContent(
      "src/lib/x.ts",
      "if (!value && y !== z) return;",
    );
    expect(v.some((x) => x.rule === "FORBIDDEN-EXCL")).toBe(false);
  });

  it("does NOT flag ! in Tailwind class strings", () => {
    const v: Violation[] = scanContent(
      "src/components/X.tsx",
      '<div className="!px-0 !py-2" />',
    );
    expect(v.some((x) => x.rule === "FORBIDDEN-EXCL")).toBe(false);
  });
});
