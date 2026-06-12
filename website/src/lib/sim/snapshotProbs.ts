// Auto-generated from M2 batch batch_20260612_212941Z on 2026-06-12T21:29:41Z.
// Source: scripts/generate_snapshot_probs_ts.py
// Do not edit manually. cp-11 ships this regeneration on every nightly.
// Generator reads team_runs_M2.parquet directly via aggregate_team_progression()
// rather than tournament.json, because the regen path has a known
// code→team_id mapping bug (Congo DR duplicated, Tunisia missing).
// Reading from parquet sidesteps that bug; cp-12 will fix the root cause.
// Fields: pG=group_qual pR=reach_r16 pQ=reach_qf pS=reach_sf pF=reach_final pC=champion

export interface TeamProbs {
  pG: number; // P(qualify from group = enter R32)
  pR: number; // P(advance past R32 to R16)
  pQ: number; // P(advance past R16 to QF)
  pS: number; // P(advance past QF to SF)
  pF: number; // P(advance past SF to F)
  pC: number; // P(win tournament)
}

export const TEAM_PROBS: Record<string, TeamProbs> = {
  ALG: { pG: 0.4187, pR: 0.1027, pQ: 0.0191, pS: 0.0048, pF: 0.0024, pC: 0.0006 },
  ARG: { pG: 0.9521, pR: 0.6841, pQ: 0.4262, pS: 0.2765, pF: 0.2221, pC: 0.142 },
  AUS: { pG: 0.5657, pR: 0.2328, pQ: 0.0936, pS: 0.0431, pF: 0.0103, pC: 0.0024 },
  AUT: { pG: 0.5139, pR: 0.1391, pQ: 0.0264, pS: 0.0082, pF: 0.004, pC: 0.001 },
  BEL: { pG: 0.9734, pR: 0.5664, pQ: 0.2793, pS: 0.1624, pF: 0.0815, pC: 0.0343 },
  BIH: { pG: 0.2646, pR: 0.1027, pQ: 0.0255, pS: 0.005, pF: 0.0003, pC: 0.0001 },
  BRA: { pG: 0.974, pR: 0.7088, pQ: 0.4404, pS: 0.3029, pF: 0.1404, pC: 0.065 },
  CAN: { pG: 0.6856, pR: 0.3403, pQ: 0.1477, pS: 0.047, pF: 0.009, pC: 0.0029 },
  CIV: { pG: 0.7732, pR: 0.47, pQ: 0.1951, pS: 0.0782, pF: 0.0132, pC: 0.0025 },
  COD: { pG: 0.2128, pR: 0.0434, pQ: 0.0069, pS: 0.0009, pF: 0.0004, pC: 0.0001 },
  COL: { pG: 0.7434, pR: 0.3266, pQ: 0.1334, pS: 0.046, pF: 0.0277, pC: 0.011 },
  CPV: { pG: 0.1341, pR: 0.0598, pQ: 0.0143, pS: 0.0033, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7622, pR: 0.414, pQ: 0.1711, pS: 0.0576, pF: 0.037, pC: 0.0163 },
  CUW: { pG: 0.1735, pR: 0.1211, pQ: 0.0224, pS: 0.004, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6208, pR: 0.405, pQ: 0.1595, pS: 0.0501, pF: 0.0062, pC: 0.0011 },
  ECU: { pG: 0.8735, pR: 0.5019, pQ: 0.2273, pS: 0.0952, pF: 0.0264, pC: 0.0084 },
  EGY: { pG: 0.8279, pR: 0.481, pQ: 0.2094, pS: 0.0951, pF: 0.0172, pC: 0.0036 },
  ENG: { pG: 0.9077, pR: 0.6305, pQ: 0.4149, pS: 0.193, pF: 0.1461, pC: 0.0825 },
  ESP: { pG: 0.9781, pR: 0.7761, pQ: 0.5985, pS: 0.4324, pF: 0.3155, pC: 0.1911 },
  FRA: { pG: 0.931, pR: 0.6984, pQ: 0.4307, pS: 0.276, pF: 0.2221, pC: 0.1418 },
  GER: { pG: 0.9731, pR: 0.6233, pQ: 0.3811, pS: 0.1805, pF: 0.0876, pC: 0.0396 },
  GHA: { pG: 0.0486, pR: 0.0063, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1332, pR: 0.1062, pQ: 0.0231, pS: 0.0051, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8948, pR: 0.4701, pQ: 0.2159, pS: 0.11, pF: 0.0298, pC: 0.01 },
  IRQ: { pG: 0.1218, pR: 0.0184, pQ: 0.0019, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1153, pR: 0.013, pQ: 0.0012, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7149, pR: 0.4042, pQ: 0.1832, pS: 0.0731, pF: 0.0285, pC: 0.0097 },
  KOR: { pG: 0.8071, pR: 0.5231, pQ: 0.251, pS: 0.1027, pF: 0.0244, pC: 0.0073 },
  KSA: { pG: 0.2093, pR: 0.093, pQ: 0.0238, pS: 0.0069, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9744, pR: 0.7055, pQ: 0.421, pS: 0.2909, pF: 0.1334, pC: 0.0608 },
  MEX: { pG: 0.9217, pR: 0.6536, pQ: 0.4285, pS: 0.2059, pF: 0.0722, pC: 0.0289 },
  NED: { pG: 0.866, pR: 0.5922, pQ: 0.3863, pS: 0.1792, pF: 0.1022, pC: 0.0471 },
  NOR: { pG: 0.2796, pR: 0.0669, pQ: 0.0128, pS: 0.0026, pF: 0.0013, pC: 0.0004 },
  NZL: { pG: 0.1532, pR: 0.1127, pQ: 0.0198, pS: 0.0025, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2815, pR: 0.0884, pQ: 0.0207, pS: 0.0028, pF: 0.0012, pC: 0.0003 },
  PAR: { pG: 0.3686, pR: 0.1381, pQ: 0.0524, pS: 0.0192, pF: 0.0023, pC: 0.0007 },
  POR: { pG: 0.8588, pR: 0.461, pQ: 0.2473, pS: 0.0991, pF: 0.0699, pC: 0.0344 },
  QAT: { pG: 0.4265, pR: 0.1854, pQ: 0.0567, pS: 0.0146, pF: 0.0025, pC: 0.0008 },
  RSA: { pG: 0.4294, pR: 0.2762, pQ: 0.0905, pS: 0.0239, pF: 0.0031, pC: 0.0005 },
  SCO: { pG: 0.6282, pR: 0.4838, pQ: 0.2086, pS: 0.0782, pF: 0.0108, pC: 0.0017 },
  SEN: { pG: 0.6676, pR: 0.2774, pQ: 0.0817, pS: 0.0317, pF: 0.0188, pC: 0.0078 },
  SUI: { pG: 0.8443, pR: 0.5137, pQ: 0.3029, pS: 0.1252, pF: 0.0394, pC: 0.0126 },
  SWE: { pG: 0.3459, pR: 0.1612, pQ: 0.0573, pS: 0.0208, pF: 0.0048, pC: 0.0016 },
  TUN: { pG: 0.2799, pR: 0.1261, pQ: 0.0411, pS: 0.0111, pF: 0.0015, pC: 0.0003 },
  TUR: { pG: 0.6035, pR: 0.2611, pQ: 0.11, pS: 0.0551, pF: 0.0135, pC: 0.0034 },
  URU: { pG: 0.8292, pR: 0.4409, pQ: 0.1452, pS: 0.0703, pF: 0.033, pC: 0.0126 },
  USA: { pG: 0.7524, pR: 0.3637, pQ: 0.1886, pS: 0.1061, pF: 0.0365, pC: 0.0127 },
  UZB: { pG: 0.185, pR: 0.0298, pQ: 0.0051, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
