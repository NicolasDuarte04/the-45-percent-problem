# WORKFLOW.md

How we work on The 45% Problem. This document is the operating model for collaboration between Nicolás (project owner), Claude (advisor and prompt author, working in the Claude desktop app), and Claude Code (the agent that writes code, runs in a terminal session against this repo).

Read this end to end if you are a new agent picking up this repo. Read the introduction if you are returning. The patterns described here have been refined across cp-04 through cp-10 (May 26 to June 3, 2026) and are what protects the project from the failure modes that have surfaced.

## Introduction: three actors, three roles

**Nicolás** is the project owner. He makes architectural and product decisions, reviews PRs, merges to main, and decides scope and timing. He does not write code in this workflow; he reads it, judges it, and approves it. He is the only person with credentials to push to main or modify production secrets.

**Claude (advisor)** runs in the Claude desktop app and has access to the repository files on disk. Claude reads the codebase, drafts prompts for Claude Code, cross-checks Claude Code's output against the project's invariants, and writes the durable documents (this file, `PLAN.md`, checkpoint prompts, design briefs, diagnostic prompts). Claude does NOT write production code. The boundary is enforced: code goes through Claude Code so it gets verified, tested, and committed under one authority.

**Claude Code** is the coder. It runs in a terminal session against a clean checkout of the repo, receives one self-contained prompt per session, executes the work, runs verification, and reports back. A fresh Claude Code session is spawned per checkpoint to keep context clean and to enforce hard handoffs between scopes.

The flow is always the same: Nicolás describes intent, Claude drafts a prompt, Nicolás hands the prompt to a fresh Claude Code session, Claude Code does Stage 1 (inspection) and stops, Nicolás approves the plan, Claude Code does Stage 2 (implementation), Nicolás reviews and merges, Claude cross-checks. Repeat.

## The unit of work: one checkpoint, one prompt, one session

Every piece of work is a checkpoint. Each checkpoint:

- Has a number (`cp-04`, `cp-05`, `cp-05a`, `cp-06`, ..., `cp-10`, `cp-10.1`, etc.).
- Has a written prompt at the repo root (`CHECKPOINT_<NUMBER>_<SHORT_NAME>_PROMPT.md`).
- Runs in one fresh Claude Code session (no re-use across checkpoints).
- Produces one PR on a branch named `cp-<NUMBER>-<short-name>`.
- Either ships (merged to main) or fails (reverted before merging).

The reasons for this discipline have been earned the hard way:

- **One prompt per session** keeps Claude Code's context narrow. Across cp-04 through cp-10, sessions that tried to hold two scopes drifted; sessions held to one scope shipped clean.
- **Fresh sessions per checkpoint** prevent context pollution. The agent that just shipped cp-09 holds different working knowledge than the cp-10 author needs; spawning fresh forces the new context to be assembled from the prompt and the current state of the repo, not from stale assumptions.
- **Written prompts in the repo** means every checkpoint has a permanent record of what the agent was asked to do. When something is wrong, we can re-read the brief; we are not relying on chat memory.
- **Branch names matched to checkpoint numbers** means git history is self-describing. `git log --oneline` reads as a checkpoint sequence; reviewers can trace which scope produced which change.

## Prompt structure: the eight-section template

Every checkpoint prompt follows this structure. Deviations are by exception, not default.

1. **Read first.** A list of files the agent must read end to end before any other work. Always includes `WORKFLOW.md` (this file) and `PLAN.md` (the current project plan). Sometimes includes the prior checkpoint's PR description, the relevant diagnostic doc, or a brief.

2. **Goal.** One paragraph that names the outcome. Not the steps; the outcome. "After this checkpoint ships, X is true." This is the single sentence the agent re-reads when it gets lost.

3. **Why this matters.** One paragraph that names the consequence of not shipping. The cost of failure. This is what tells the agent when to stop and report vs. when to push through.

4. **Branch.** The exact branch name (`cp-<NUMBER>-<short-name>`) and the pre-work to set it up (`git fetch`, `git checkout main`, `git pull`, branch off, confirm clean tree).

5. **Stage 1 — Inspection (for non-trivial checkpoints).** The agent reads the relevant code, traces the data flow, surfaces options, and writes inspection notes to `docs/onboarding/<checkpoint>-inspection-notes.md`. The agent STOPS at the end of Stage 1 with a hard gate: "Awaiting Nicolás's review of the plan before Stage 2." This is the most important pattern in the entire workflow.

6. **Stage 2 — Implementation (after Nicolás approves).** The actual code work. Includes scope expectations, design constraints, conventions to respect, what's explicitly out of scope, and decision trees for "what if X doesn't match the spec."

7. **Verification.** A specific checklist of things the agent must verify before declaring ready. Includes both code (tests, lint, typecheck) and user-visible behavior (browser checks, production curls, preservation of prior checkpoints).

8. **Merge-readiness checklist.** A Y/N checklist the agent fills in before pushing. Items can be marked `Y*` (with substantive rationale) for items that have legitimate exceptions; never `N` for "I'll do this later" — `N` means stop and report.

There is one variant: **read-only audits** (like the 2026-06-01 and 2026-06-03 diagnostics) drop Stage 1/Stage 2 and replace them with "Methodology" and "Document structure" sections. Audits do not modify code; they produce one markdown file under `docs/audit/`. The same eight-section discipline still applies in spirit.

## The two-stage pattern: inspect, stop, then implement

The single most important behavioral pattern in this workflow is the Stage 1 hard stop.

When a Claude Code session reaches the end of Stage 1, it stops and waits. It does NOT begin implementation. It does NOT make irreversible changes. It writes inspection notes that:

- Trace the current data flow with file:line citations.
- Identify the root-cause gap the checkpoint must close.
- Surface implementation options (typically two or three).
- Recommends one with reasoning.
- Flags open risks and unknowns.
- States explicitly: "Awaiting Nicolás's review of the plan before Stage 2 begins."

Nicolás then reviews the inspection notes (often pasted back to Claude advisor for cross-check), confirms the plan or asks for modifications, and only then unblocks Stage 2.

This pattern has saved the project from several wrong-shape implementations across cp-04 through cp-10:

- In cp-08, Stage 1 surfaced that the design package's `HomePage.jsx` was a reference-only mockup, not a template to port. Without the stop, the agent would have replaced the homepage hero (the failure mode of the dead first cp-08).
- In cp-10, Stage 1 caught that the MC's synthesized `G-A-1` match IDs and the database's `M01-M104` would never line up without a unification migration. Without the stop, the agent would have built a translator (Option B) that introduced silent drift.
- In cp-07, Stage 1 found that the simulator's `[ ARM ALERT ]` and `[ See how the model reacts ]` were the same button under different labels. Without the stop, the agent would have removed one or both without realizing.

The Stage 1 cost is half an hour to two hours of agent inspection time. The Stage 2 cost without Stage 1 is multiple days of rework when the wrong-shape implementation has to be reverted. The trade is always worth it.

## Readiness checklists: Y, N\*, never silent N

Every prompt ends with a readiness checklist. The agent fills it in before pushing.

The allowed states are:

- **`Y`** — verified, with evidence. The agent has actually checked this; it is not aspirational.
- **`N*`** — explicitly not done, with substantive rationale that justifies the exception. Examples: "Mobile viewports verified structurally via build output; interactive tap checks deferred to Nicolás's incognito pass" (cp-08), or "Screenshot skipped because the slots-populated rendering branch is a no-op until cp-12 ships" (cp-09).
- **`N`** — incomplete, with a blocker explanation. The agent does NOT push. It reports and waits.

What is NOT allowed:

- Silent `Y` on items the agent did not actually check.
- `N` with "will do later" — that's not a checklist, that's a deferral, and it belongs in the PR description as a follow-up, not in the readiness state.
- Skipping the checklist because "everything obviously passed."

Substantive `N*` rationale is encouraged. The point of the checklist is not to pretend; it is to make every exception visible to the reviewer. The cp-08 readiness report's two `Y*` qualifications were what surfaced the items that needed Nicolás's eyes; the report would have been weaker if the agent had silently marked them `Y`.

## Two-commit PR structure

Most checkpoint PRs land as two commits on the same branch:

1. **`chore(docs): import <reference material>`** — the design package, the diagnostic doc, the inspection notes, or any reference material the implementation depends on. Separable from the implementation; reviewable as "did the files arrive in the right place."

2. **`<cp-NUMBER>: <short description>`** — the actual code work. Reviewable as "does the implementation match the brief and the plan."

The benefit is reviewability: Nicolás reads the implementation commit closely and skims the docs import. If a future reviewer needs to understand what the agent was working from, the docs commit is right there in the history.

Small checkpoints (one-file fixes, label-only changes) can be one commit. Large checkpoints (Stage 1 inspection notes + a substantial implementation) sometimes land as three commits. The pattern is "make the PR reviewable in passes," not "always exactly two."

## Branch and PR conventions

- **Branch names**: `cp-<NUMBER>-<short-name>` for implementation checkpoints; `docs/<topic>-<date>` for read-only audits. Numbers are sequential by ship order, not by plan order; deferred or skipped checkpoints leave gaps that are never re-used.
- **PRs**: opened as **draft** until the agent has run the full verification pass and filled in the readiness checklist. Nicolás promotes from draft to ready-for-review when he is satisfied; he merges when he has decided to ship.
- **No direct pushes to main**: every change goes through a PR, even one-line typo fixes. This is enforced by branch protection but also by discipline; agents never `git push origin main`.
- **Force-pushes**: forbidden on main; allowed on feature branches before review begins, discouraged after. After a review starts, additional commits are appended rather than amended.

## Decision-making: AskUserQuestion-style structured options

When an architectural choice has multiple legitimate answers, the prompt or the inspection notes surface them as numbered options. Format:

```
Q: Should the cron use DATABASE_URL (pooled) or DIRECT_URL (non-pooled)?

Option A — DATABASE_URL: simpler, matches what cp-09 already uses, but
  long-running batch scripts can hit pgbouncer prepared-statement issues.
Option B — DIRECT_URL: safer for batch scripts, ~5 extra minutes of work
  to add the resolver. (RECOMMENDED)
Option C — Skip the database entirely; build a parquet export shim.
  Cleanest architecturally but adds a full day of work.

Recommend Option B. Awaiting confirmation.
```

The advisor (or the user) replies with the picked option and a one-sentence rationale. The agent then implements that option. The decision is captured in the PR description so future readers can see what was decided and why.

This pattern is preferable to "the agent picks and the user hopes" because the picks are explicit, the trade-offs are documented, and the decision is reviewable.

## Documents and their roles

Five document types exist in this workflow. Each has a specific role and a specific lifecycle.

- **`WORKFLOW.md`** (this file). The operating model. Updated when the operating model itself changes. Read end to end by every new agent.
- **`PLAN.md`**. The current project plan. Lists shipped checkpoints, active checkpoints, pending checkpoints, post-launch backlog, decision log, acceptance criteria. Updated after every checkpoint ships and after every diagnostic. Replaces `GO_TO_LAUNCH.md` (which is acknowledged stale).
- **`CHECKPOINT_<N>_<NAME>_PROMPT.md`** at the repo root. One per checkpoint. Authored by Claude advisor, handed to a fresh Claude Code session. Lives in the repo so future readers can see exactly what was asked.
- **`docs/audit/architecture-diagnostic-<date>.md`**. Periodic static audits of the current state. Authored by a Claude Code session under a read-only audit prompt. Surfaces silent failures, drift, and unfinished work. The 2026-06-01 and 2026-06-03 diagnostics are the prototypes.
- **`docs/onboarding/<checkpoint>-inspection-notes.md`** and **`docs/onboarding/<checkpoint>-additive-inspection-notes.md`**. Stage 1 deliverables. Captured for the duration of the checkpoint and preserved in the repo as a record of what the agent learned before implementing.

What is NOT a document in this workflow:

- Chat scrollback. Everything load-bearing must land in a document; nothing important should live only in chat.
- Verbal handoffs between agents. Even when context is transferred between Claude advisor and Claude Code, it goes through written prompts, not casual descriptions.

## Periodic audits

Every few checkpoints, a static audit is commissioned. The audit is a read-only diagnostic that verifies the deployed system matches what we believe was shipped. The 2026-06-01 diagnostic produced the cp-09 / cp-10 / cp-11 / cp-12 / cp-13 sequence. The 2026-06-03 diagnostic found two P0s that would have shipped silently without it (gitignored input parquets crashing the cron; no CI gate).

Audits are commissioned after major waves and before starting new ones. They are valuable specifically because they have an adversarial posture: the auditor's job is to NOT trust that the prior checkpoints shipped what they claimed. "Verified" in an audit means observed via file:line evidence or live curl, never trusted.

Audit findings drive the next plan revision. The PLAN.md after an audit reflects what the audit found, not what we wished to be true.

## Pitfalls and patterns that protect against them

Across cp-04 through cp-10 and the two diagnostics, certain failure modes have recurred. Each one has a counter-pattern.

**Pitfall: Silent failures in production paths.** Code that fails-fast in dev but fails-silent in production (e.g., cp-10's loader falling back to default-0 if DB is unreachable). Counter: every production-critical path has either a CI smoke test (the cp-10.2 work) or a visible-on-the-site provenance field that flags the fallback (the `settled_source` label in `snapshot_meta.notes`).

**Pitfall: Untracked files load-bearing on production.** A file the code reads but git ignores. Cp-09 introduced this with the fixtures parquet. Counter: every file the production pipeline reads must be either git-tracked or built by a CI step before the pipeline runs. Anything else is a latent crash waiting for a clean checkout.

**Pitfall: Stale context across checkpoints.** An agent assumes that what was true in the prior checkpoint is true now. Counter: fresh sessions per checkpoint, prompts that re-state the relevant invariants, mandatory re-reading of `WORKFLOW.md` and `PLAN.md` at the start of every session.

**Pitfall: Drift between claimed shipped behavior and actual production state.** The site says "M2 is live" but the snapshot was generated by M0; the agent claims "tests pass" but the test was mocking the load path. Counter: periodic audits with adversarial posture; "verified" in any state document means observed, never trusted.

**Pitfall: One-shot fixes that aren't structurally permanent.** Cp-09 backfilled `bracket.json` once; cp-12 makes the pipeline write it on every run. Counter: when a one-shot fix is the right scope for the moment, name the structural follow-up in the next plan revision so it doesn't get forgotten.

**Pitfall: The "I'll come back to it" item.** A `N` on the readiness checklist with no specific owner. Counter: every `N` is either a blocker (stop, report, fix here) or a follow-up checkpoint (named in the PR description with a `cp-<next-number>` placeholder so it gets scheduled).

## What to do if you are a new agent reading this

You have just been spawned in a Claude Code session against this repo, you have been handed a prompt, and you have read this far. Now:

1. Confirm you have a checkpoint prompt at the repo root. If not, ask Nicolás for the prompt path.
2. Read `PLAN.md` to understand the current project state.
3. Read the prompt end to end.
4. Read every "Read first" file the prompt names.
5. Run `git status` and `git branch` to confirm you are starting from a clean main.
6. Follow the prompt's Stage 1 instructions.
7. Stop at the end of Stage 1, write your inspection notes, and report back to Nicolás.
8. Do not begin Stage 2 until you have an explicit green light.

When in doubt, re-read the prompt's Goal section. When still in doubt, ask.

## What to do if you are Claude advisor (in the desktop app) reading this

You are tasked with writing prompts and cross-checking output. Now:

1. Read `PLAN.md` to see the current state.
2. Identify the next checkpoint (or the one Nicolás named).
3. If the checkpoint scope is unclear, ask Nicolás for clarification before writing the prompt.
4. Use the eight-section template.
5. Cite file:line evidence wherever possible.
6. Bake decision trees into the prompt for likely failure modes.
7. Name out-of-scope items explicitly.
8. Save the prompt at the repo root.

When the agent's output comes back, cross-check it against the brief. The cross-check posture is "verify, do not trust" — same as an audit. If the agent's readiness report is `Y` across the board but the implementation pulled in a barrel file by accident (cp-06 risk), the cross-check catches it. If the agent says "all tests pass" but the test mocks the data path (cp-09 risk), the cross-check catches it.

## What to do if you are Nicolás reading this

You are the only person who can merge to main and the only person whose judgment can override the agent's reading of the spec. Now:

1. Read every PR's implementation commit closely.
2. Read every inspection notes file before approving Stage 2.
3. When the agent presents three options with a recommendation, accept the recommendation if you trust the reasoning, override if you have context the agent does not.
4. After every checkpoint ships, ask whether the operating model needs an update. If a new failure mode surfaced, the next prompt should bake in the counter-pattern.
5. Commission a fresh audit after every major wave.

The discipline is not a constraint on you; it is what makes the agents useful. Without it, you are driving a fast car without brakes. With it, you have a system that catches its own mistakes most of the time and a process for surfacing the rest.
