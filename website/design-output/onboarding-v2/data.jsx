// ─────────────────────────────────────────────────────────────────────────
// Onboarding v2 · canonical snapshot
// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH. Every probability, team, and ranking rendered in this
// mockup reads from here. In production these objects are replaced by reads from
// website/public/data/latest/. No surface hardcodes a figure inline; any callout
// (chip, modal, walk-through) pulls from these structures so a stale value can
// never diverge from what the leaderboard renders.
//
// Values mirror the live snapshot at 45analytics.com/data/latest/tournament.json.
// Spain leads at 18.2%; Brazil has slipped to ~6.3%, below Morocco. The modal's
// "what the model says" prose references LEADER (Spain) and updates automatically
// if these values change.

const SNAPSHOT = {
  id:    '2026-05-30T23:00Z',
  sha:   'a3f9c1',
  phase: 'Group stage (open)',
  tag:   'phase-2-open',
  remaining: 32,
  mcRuns: 10000,
  osf:   'osf.io/8b5hd',
};

// Championship pricing — model (p) vs de-vigged market (q). color = Prism hue.
// sf = model-implied probability of reaching the semifinals. Illustrative but
// derived: a top seed's title prob ≈ P(SF)·P(win SF)·P(win final), and for these
// seeds the two knockout wins compound to roughly a third — so P(SF) ≈ ~2.7× the
// championship prob. Used by the Final Four walk-through to compute a Reality
// Score that traces back to these same model numbers rather than a typed-in count.
const TOURNAMENT = [
  { team: 'Spain',       code: 'ESP', p: 0.1824, q: 0.1620, sf: 0.46, color: 'var(--prism-peach)'  },
  { team: 'France',      code: 'FRA', p: 0.1488, q: 0.1400, sf: 0.40, color: 'var(--prism-coral)'  },
  { team: 'Argentina',   code: 'ARG', p: 0.1374, q: 0.1300, sf: 0.37, color: 'var(--prism-rose)'   },
  { team: 'England',     code: 'ENG', p: 0.0830, q: 0.0920, sf: 0.23, color: 'var(--prism-plum)'   },
  { team: 'Morocco',     code: 'MAR', p: 0.0642, q: 0.0520, sf: 0.18, color: 'var(--prism-indigo)' },
  { team: 'Brazil',      code: 'BRA', p: 0.0630, q: 0.0710, sf: 0.18, color: 'var(--prism-cyan)'   },
  { team: 'Germany',     code: 'GER', p: 0.0540, q: 0.0580, sf: 0.15, color: 'var(--prism-mint)'   },
  { team: 'Netherlands', code: 'NED', p: 0.0410, q: 0.0480, sf: 0.12, color: 'var(--prism-sun)'    },
];

// The single data point the modal calls attention to — derived, not retyped.
const LEADER = TOURNAMENT[0];

const FEATURED = [
  { id: 'f1', kickoff: '06-14 20:00Z', match: 'France ‒ Germany', p: 0.3812, q: 0.4105, E: -0.0293,
    blurb: 'Our 38.1% reflects Germany\u2019s structurally stronger xG per possession; market is pricing a draw premium the model does not see.' },
  { id: 'f2', kickoff: '06-13 18:00Z', match: 'Brazil ‒ Spain', p: 0.4512, q: 0.4182, E: 0.0330,
    blurb: 'Largest single divergence this window. Sensitivity analysis attributes 61% of the edge to the Dixon-Coles correlation term.' },
  { id: 'f3', kickoff: '06-14 22:00Z', match: 'Argentina ‒ Mexico (O/U 2.5)', p: 0.5420, q: 0.5184, E: 0.0236,
    blurb: 'Market continues to price ARG\u2019s defensive rebuild at pre-2025 levels; our \u03bb_against has dropped 14% since March.' },
];

const ESSAYS = [
  { kind: 'Essay',    title: 'The 45% problem, in three figures', authors: 'J. Ribeiro · A. Lenehan', date: '2026-05-20', kicker: 'Phase 1 findings' },
  { kind: 'Protocol', title: 'Pre-registration, amendments, and failure modes', authors: 'M. Osei', date: '2026-04-02', kicker: 'Methodology · v12.1' },
  { kind: 'Note',     title: 'Why we publish a ledger, not a record', authors: 'J. Ribeiro', date: '2026-03-15', kicker: 'Editorial · short' },
  { kind: 'Essay',    title: 'Calibration, sharpness, and the tyranny of accuracy', authors: 'A. Lenehan', date: '2026-02-28', kicker: 'Research · 18 min' },
];

const CALIBRATION = { brier: 0.2038, logloss: 0.3012, nSettled: 2448 };

// ── Surface B · Final Four demo ──────────────────────────────────────────
// The walk-through illustrates the simulator with a worked Final Four pick.
// Reality Score is, by definition, a function of the visitor's own pick — there
// is no "real" number until someone picks — so the figure shown is ILLUSTRATIVE.
// It is derived (not invented): the count below = product of the four picks' sf
// values × the MC run count, so it traces back to the same model numbers that
// render in the leaderboard. The Final Four grid is restricted to the eight teams
// the leaderboard already shows, so nothing in the walk-through introduces a
// probability the visitor can't find on the homepage.
//
// Open question #4 — the demo rarity number. v1 used "1 in 847" (count ≈ 12), a
// far more contrarian set than three favorites + one displayed long-shot. For the
// default pick {Spain, France, Argentina, Morocco} — three favorites plus the
// mid-tier the "45% problem" is about:
//   0.46·0.40·0.37·0.18 ≈ 0.01225 → ≈ 123 / 10,000 → ≈ 1 in 81.
// That is the defensible figure for THIS pick. Computed live in SurfaceB; the
// constant below is only the pre-fill. Tagged "illustrative / do not implement".
const FINAL_FOUR_DEMO = {
  picks: ['Spain', 'France', 'Argentina', 'Morocco'],
  total: 10000,
};

// The model's own median Final Four = the four highest sf values.
function modelMedianFour() {
  return [...TOURNAMENT].sort((a, b) => b.sf - a.sf).slice(0, 4).map(t => t.team);
}

// Reality Score for a Final Four pick = product of the four semifinal
// probabilities × the MC run count. Returns { count, total, oneInN, band }.
function finalFourScore(teamNames, total = 10000) {
  const byName = Object.fromEntries(TOURNAMENT.map(t => [t.team, t]));
  const prod = teamNames.reduce((acc, n) => acc * (byName[n]?.sf ?? 0), 1);
  const count = Math.max(1, Math.round(prod * total));
  return { count, total, oneInN: oneInN(count, total), band: rarityBand(count, total) };
}

// Rarity bands — mirrors the simulator's getRarityBand thresholds.
function rarityBand(count, total = 10000) {
  const pct = count / total;
  if (pct >= 0.15)  return { label: 'Right down the middle', caption: 'The model would have called this too.' };
  if (pct >= 0.05)  return { label: 'A reasonable read',     caption: 'Inside the model\u2019s plausible range.' };
  if (pct >= 0.01)  return { label: 'A bold call',           caption: 'The model rates this an outside chance.' };
  if (pct >= 0.003) return { label: 'Against the grain',     caption: 'Few of the 10,000 runs land here.' };
  return { label: 'Almost no one sees this', caption: 'Fewer than 1 in 300 runs agree.' };
}

function oneInN(count, total = 10000) {
  if (!count) return '—';
  return '1 in ' + Math.round(total / count).toLocaleString();
}

Object.assign(window, {
  SNAPSHOT, TOURNAMENT, LEADER, FEATURED, ESSAYS, CALIBRATION,
  FINAL_FOUR_DEMO, modelMedianFour, finalFourScore, rarityBand, oneInN,
});
