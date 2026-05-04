/**
 * Build-time check: §6.6 Language Constraints + simulator-aware vocab gates.
 *
 * ── Why phrase patterns, not bare-word regexes ───────────────────────────────
 *
 * An earlier iteration of this script proposed bare \bword\b regexes for
 * `predict`, `pick`, `lock`, `play`, `returns`, `tip`, `profit`. A dry-run
 * against the codebase produced 36 false positives — every one of them
 * legitimate non-product text:
 *   - TypeScript built-ins (the Pick<T> utility type)
 *   - JSDoc convention (a "Returns the directory" leader on a function)
 *   - English code comments (a comment using the verb "returns")
 *   - Git tag identifiers (e.g. v1.0.0-mstar-lock)
 *   - The project's own academic vault essays (research writing about
 *     prediction, locks-on-publication, returns-on-investment)
 *   - A Blueprint Kelly-sizing term ("5% longshot", defined in
 *     CLAUDE.md key-numbers table; banning it would forbid the project
 *     from describing its own methodology)
 *
 * The diagnosis: gambling jargon is **collocational**, not single-word.
 * "Lock the door" is fine; "lock of the day" is not. "Predict the weather"
 * is fine; "predict the winner" is not. "Returns the directory" is fine;
 * "expected returns" is not. Multi-word phrase patterns capture the
 * gambling-coded usage without sweeping in innocent everyday English or
 * domain-appropriate research terminology.
 *
 * So this script uses substring phrases only. The simulator-aware
 * machinery (SIMULATOR_SURFACES + EMAIL_SYSTEM_FORBIDDEN_REGEX) is
 * retained as **dormant scaffolding** — see the comment block on those
 * tables below. It does not currently fire any rules but is structurally
 * ready for the day a single-word ban makes sense (with a tighter regex
 * or a surface-aware extractor; both are tracked as known follow-ups).
 *
 * Note on `longshot`: this term is intentionally allowed. It is defined
 * in Framework_Blueprint_v1.0 §5.4 as the Kelly-sizing threshold for
 * implied probabilities below 10% (Kelly fraction f=1/8, vs f=1/4 for
 * mainline). The project's vault and methodology pages must be free to
 * describe their own pre-registered parameters.
 *
 * ── Surfaces scanned ─────────────────────────────────────────────────────────
 *
 *   - In TSX/TS: values of aria-label, alt, placeholder, title, description,
 *     content props/attributes, and JSX text nodes (heuristically) for the
 *     exclamation-mark check; full file content for phrase matching.
 *   - In MDX/MD: all text outside code blocks.
 *
 * Exclamation marks in TypeScript operators (!value, !==) and in Tailwind
 * class strings (className="!px-0") are intentionally NOT flagged.
 *
 * Run via: node scripts/check-forbidden-words.mjs
 * Importable: scanContent(relPath, content) returns Violation[].
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── GLOBAL_FORBIDDEN_PHRASES (substring, banned everywhere) ──────────────────
// Case-insensitive substring match. Multi-word phrasings preferred for the
// reasons documented at the top of this file.
const GLOBAL_FORBIDDEN_PHRASES = [
  // §6.6 original nine — preserved verbatim.
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

  // Simulator-brief additions: gambling-coded vocabulary that has no
  // innocent reading in any project surface (product copy, vault essays,
  // simulator UI alike). Single unambiguous nouns plus collocational
  // phrasings; no bare verbs.
  "moneyline",
  "parlay",
  "payout",

  // "lock" / "pick" / "tip" collocations.
  "lock of the day",
  "lock in",
  "lock it in",
  "pick of the day",
  "pick to win",
  "your picks",
  "make your picks",
  "tip of the day",

  // "predict the X" gambling idioms (the bare verb "predict" is
  // unconstrained — vault essays use it correctly).
  "predict the winner",
  "predict the score",

  // Streak / outcome-coded phrasings.
  "hot streak",
  "cold streak",

  // Adversarial framings.
  "beat the house",
  "beat the book",
  "beat the model",

  // Action-tone phrases.
  "send it",

  // "returns" / "profit" collocations — bare words are too noisy
  // (JSDoc @returns, code comments, financial-research vault essays).
  "expected returns",
  "guaranteed returns",
  "pure profit",
  "quick profit",
];

// ── Dormant scaffolding ──────────────────────────────────────────────────────
// The two tables below are intentionally empty. They are retained as
// structural scaffolding so a future single-word ban (paired with either
// tighter regex anchoring or a surface-aware copy extractor) can hook
// in without re-introducing this machinery from scratch. Both code paths
// in scanContent() are exercised by the unit tests below to keep them
// alive even when the rule set is empty.
//
// Adding a rule here requires either:
//   (a) a regex tight enough that it does not match TypeScript identifiers,
//       JSDoc, or research prose (e.g., a multi-word lookahead pattern), or
//   (b) running the rule only against extracted user-facing copy (JSX text
//       nodes + COPY_ATTRS values + MDX prose), not full file content.
// The dry-run that produced 36 false positives is the cautionary tale.

const GLOBAL_FORBIDDEN_REGEX = [
  // Empty by design. See block comment above.
  // Schema: { pattern: RegExp, label: string }
];

const EMAIL_SYSTEM_FORBIDDEN_REGEX = [
  // Empty by design. See block comment above. When populated, rules here
  // skip files matched by SIMULATOR_SURFACES below — i.e., simulator UI
  // and templates may use the rule's vocabulary as part of its product.
  // Schema: { pattern: RegExp, label: string }
];

const SIMULATOR_SURFACES = [
  // Path-prefix allowlist for EMAIL_SYSTEM_FORBIDDEN_REGEX rules. Currently
  // unused (that table is empty), but kept ready and forward-compatible.
  // Phase B email templates are listed pre-emptively; matching is by
  // path-contains, so a prefix that doesn't yet exist on disk simply
  // never hits — no warning, no error.
  path.join("src", "app", "(simulator)") + path.sep,
  path.join("src", "components", "simulator") + path.sep,
  path.join("src", "lib", "sim") + path.sep,
  path.join("src", "emails", "PredictionVerificationEmail.tsx"),
  // Phase B (reserved):
  path.join("src", "emails", "PredictionDeadEmail.tsx"),
  path.join("src", "emails", "PredictionPromotedEmail.tsx"),
];

export function isSimulatorSurface(relPath) {
  return SIMULATOR_SURFACES.some((prefix) => relPath.includes(prefix));
}

// ── User-facing attribute names (check their string values for !) ─────────────
const COPY_ATTRS = [
  "aria-label",
  "alt",
  "placeholder",
  "title",
  "description",
  "content",
  "aria-describedby",
  "aria-valuetext",
  "label",
];

const COPY_ATTR_EXCL_RE = new RegExp(
  `(?:${COPY_ATTRS.join("|")})\\s*=\\s*(?:"[^"]*![^"]*"|'[^']*![^']*'|\\{\\s*"[^"]*![^"]*"\\s*\\})`,
  "gi"
);

const JSX_TEXT_EXCL_RE = />[^<>]*![^<>]*</;

// ── File extensions ───────────────────────────────────────────────────────────
const CODE_EXTENSIONS  = new Set([".tsx", ".ts"]);
const PROSE_EXTENSIONS = new Set([".mdx", ".md"]);
const DATA_EXTENSIONS  = new Set([".json"]);
const ALL_EXTENSIONS   = new Set([...CODE_EXTENSIONS, ...PROSE_EXTENSIONS, ...DATA_EXTENSIONS]);

// ── Skip patterns ─────────────────────────────────────────────────────────────
const SKIP_PATTERNS = [
  path.join("node_modules"),
  path.join(".next"),
  path.join("tests"),
  path.join("scripts"),
  path.join("public", "data", "schema"),
  path.join("public", "data", "latest"),
  path.join("public", "data", "snapshots"),
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

function* walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(fullPath)) continue;
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (ALL_EXTENSIONS.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

/**
 * Scan a single file's content. Pure: takes (relPath, content), returns
 * a list of violation records. Used by both the CLI and the unit tests.
 */
export function scanContent(relPath, content) {
  const violations = [];
  const ext = path.extname(relPath);
  const lower = content.toLowerCase();
  const lines = content.split("\n");
  const isSim = isSimulatorSurface(relPath);

  // Rule 1: substring phrases (global)
  for (const phrase of GLOBAL_FORBIDDEN_PHRASES) {
    const phraseLower = phrase.toLowerCase();
    if (!lower.includes(phraseLower)) continue;
    const lineNums = lines
      .map((l, i) => (l.toLowerCase().includes(phraseLower) ? i + 1 : null))
      .filter((n) => n !== null);
    violations.push({
      rule: "FORBIDDEN-PHRASE",
      label: phrase,
      relPath,
      lines: lineNums,
    });
  }

  // Rule 2: global word-boundary regex (currently empty; loop is alive
  // so future entries are immediately exercised without code changes).
  for (const { pattern, label } of GLOBAL_FORBIDDEN_REGEX) {
    const lineNums = [];
    lines.forEach((l, i) => {
      if (pattern.test(l)) lineNums.push(i + 1);
    });
    if (lineNums.length > 0) {
      violations.push({
        rule: "FORBIDDEN-WORD",
        label,
        relPath,
        lines: lineNums,
      });
    }
  }

  // Rule 3: email-system word-boundary regex (currently empty; skipped
  // on simulator surfaces when populated).
  if (!isSim) {
    for (const { pattern, label } of EMAIL_SYSTEM_FORBIDDEN_REGEX) {
      const lineNums = [];
      lines.forEach((l, i) => {
        if (pattern.test(l)) lineNums.push(i + 1);
      });
      if (lineNums.length > 0) {
        violations.push({
          rule: "EMAIL-SYSTEM-FORBIDDEN-WORD",
          label,
          relPath,
          lines: lineNums,
        });
      }
    }
  }

  // Exclamation-mark check (unchanged from prior behavior).
  if (CODE_EXTENSIONS.has(ext)) {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

      if (COPY_ATTR_EXCL_RE.test(line)) {
        COPY_ATTR_EXCL_RE.lastIndex = 0;
        violations.push({
          rule: "FORBIDDEN-EXCL",
          label: "exclamation in attribute copy",
          relPath,
          lines: [idx + 1],
          excerpt: trimmed.slice(0, 80),
        });
      }
      COPY_ATTR_EXCL_RE.lastIndex = 0;

      if (JSX_TEXT_EXCL_RE.test(line)) {
        violations.push({
          rule: "FORBIDDEN-EXCL",
          label: "exclamation in JSX text",
          relPath,
          lines: [idx + 1],
          excerpt: trimmed.slice(0, 80),
        });
      }
    });
  } else if (PROSE_EXTENSIONS.has(ext)) {
    let inFence = false;
    let inMathFence = false;
    lines.forEach((line, idx) => {
      const trimmed = line.trimStart();
      if (/^```/.test(trimmed)) { inFence = !inFence; return; }
      if (inFence) return;
      if (/^\$\$\s*$/.test(trimmed)) { inMathFence = !inMathFence; return; }
      if (inMathFence) return;
      const stripped = line
        .replace(/`[^`]*`/g, "")
        .replace(/\$[^$]+\$/g, "")
        .replace(/math="[^"]*"/g, "")
        .replace(/math='[^']*'/g, "");
      if (/!/.test(stripped)) {
        violations.push({
          rule: "FORBIDDEN-EXCL",
          label: "exclamation in prose",
          relPath,
          lines: [idx + 1],
          excerpt: line.trim().slice(0, 80),
        });
      }
    });
  }
  // JSON files: phrase / regex checks only, no ! check.

  return violations;
}

// Re-exported for test introspection.
export const RULE_TABLES = {
  GLOBAL_FORBIDDEN_PHRASES,
  GLOBAL_FORBIDDEN_REGEX,
  EMAIL_SYSTEM_FORBIDDEN_REGEX,
  SIMULATOR_SURFACES,
};

// ── CLI entry point ───────────────────────────────────────────────────────────
const isCli =
  import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  let violations = 0;
  const cwd = process.cwd();
  const SCAN_ROOTS = ["src"];

  for (const root of SCAN_ROOTS) {
    const rootPath = path.join(cwd, root);
    if (!fs.existsSync(rootPath)) continue;

    for (const filePath of walkFiles(rootPath)) {
      let content;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }
      const rel = filePath.replace(cwd + path.sep, "");
      const fileViolations = scanContent(rel, content);
      for (const v of fileViolations) {
        const linesStr = v.lines.length > 1 ? `lines ${v.lines.join(", ")}` : `line ${v.lines[0]}`;
        const excerpt = v.excerpt ? `: ${v.excerpt}` : "";
        console.error(`[${v.rule}] "${v.label}" in ./${rel} ${linesStr}${excerpt}`);
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(`\n§6.6 check FAILED — ${violations} violation(s). Fix before shipping.`);
    process.exit(1);
  } else {
    console.log(`§6.6 check passed — no forbidden phrases or copy exclamation marks found.`);
  }
}
