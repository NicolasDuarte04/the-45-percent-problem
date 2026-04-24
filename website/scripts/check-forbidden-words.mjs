/**
 * Build-time check: §6.6 Language Constraints
 *
 * Scans for forbidden phrases and exclamation marks in user-facing copy.
 *
 * "User-facing" is defined as:
 *   - In TSX/TS: values of aria-label, alt, placeholder, title, description,
 *     content props/attributes, and JSX text nodes (heuristically).
 *   - In MDX/MD: all text outside code blocks.
 *
 * Exclamation marks in TypeScript operators (!value, !==) and in Tailwind
 * class strings (className="!px-0") are intentionally NOT flagged.
 *
 * Run via: node scripts/check-forbidden-words.mjs
 */

import fs from "fs";
import path from "path";

// ── §6.6 Forbidden phrases ────────────────────────────────────────────────────
const FORBIDDEN_PHRASES = [
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
];

// ── User-facing attribute names (check their string values for !) ─────────────
// className / class / style are intentionally excluded — they're never copy.
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

// Regex: matches attr="...!..." or attr={'...!...'} patterns
// Built at module load time
const COPY_ATTR_EXCL_RE = new RegExp(
  `(?:${COPY_ATTRS.join("|")})\\s*=\\s*(?:"[^"]*![^"]*"|'[^']*![^']*'|\\{\\s*"[^"]*![^"]*"\\s*\\})`,
  "gi"
);

// Detect JSX text content containing ! (between > and <, not in tags)
// Heuristic: line contains > some text with ! then < (and line is not a comment)
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

// ── Main ──────────────────────────────────────────────────────────────────────
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

    const ext  = path.extname(filePath);
    const rel  = filePath.replace(cwd + path.sep, "");
    const lower = content.toLowerCase();
    const lines = content.split("\n");

    // ── Forbidden phrase check (all file types) ──────────────────────────
    for (const phrase of FORBIDDEN_PHRASES) {
      const phraseLower = phrase.toLowerCase();
      if (!lower.includes(phraseLower)) continue;
      const lineNums = lines
        .map((l, i) => (l.toLowerCase().includes(phraseLower) ? i + 1 : null))
        .filter(Boolean);
      console.error(
        `[§6.6 FORBIDDEN-PHRASE] "${phrase}" in ./${rel} line${lineNums.length > 1 ? "s" : ""} ${lineNums.join(", ")}`
      );
      violations++;
    }

    // ── Exclamation mark check (context-aware) ────────────────────────────
    if (CODE_EXTENSIONS.has(ext)) {
      // Only flag ! in user-facing attribute values or JSX text nodes
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

        if (COPY_ATTR_EXCL_RE.test(line)) {
          COPY_ATTR_EXCL_RE.lastIndex = 0;
          console.error(
            `[§6.6 FORBIDDEN-EXCL] Exclamation mark in attribute copy in ./${rel}:${idx + 1}: ${trimmed.slice(0, 80)}`
          );
          violations++;
        }
        COPY_ATTR_EXCL_RE.lastIndex = 0;

        if (JSX_TEXT_EXCL_RE.test(line)) {
          console.error(
            `[§6.6 FORBIDDEN-EXCL] Exclamation mark in JSX text in ./${rel}:${idx + 1}: ${trimmed.slice(0, 80)}`
          );
          violations++;
        }
      });
    } else if (PROSE_EXTENSIONS.has(ext)) {
      // MDX/MD: flag any !, excluding code blocks and inline code
      let inFence = false;
      lines.forEach((line, idx) => {
        if (/^```/.test(line.trimStart())) { inFence = !inFence; return; }
        if (inFence) return;
        // Strip inline code spans before checking
        const stripped = line.replace(/`[^`]*`/g, "");
        if (/!/.test(stripped)) {
          console.error(
            `[§6.6 FORBIDDEN-EXCL] Exclamation mark in ./${rel}:${idx + 1}: ${line.trim().slice(0, 80)}`
          );
          violations++;
        }
      });
    }
    // JSON and other data files: only phrase check, no ! check
  }
}

if (violations > 0) {
  console.error(
    `\n§6.6 check FAILED — ${violations} violation(s). Fix before shipping.`
  );
  process.exit(1);
} else {
  console.log(`§6.6 check passed — no forbidden phrases or copy exclamation marks found.`);
}
