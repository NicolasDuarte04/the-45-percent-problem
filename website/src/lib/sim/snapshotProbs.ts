// Auto-generated from M2 batch batch_20260615_155202Z on 2026-06-15T15:52:02Z.
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
  ALG: { pG: 0.4314, pR: 0.0983, pQ: 0.0192, pS: 0.0061, pF: 0.0027, pC: 0.001 },
  ARG: { pG: 0.9495, pR: 0.6716, pQ: 0.4096, pS: 0.268, pF: 0.2147, pC: 0.1343 },
  AUS: { pG: 0.5665, pR: 0.2278, pQ: 0.0983, pS: 0.0464, pF: 0.0097, pC: 0.0024 },
  AUT: { pG: 0.5092, pR: 0.136, pQ: 0.0294, pS: 0.0076, pF: 0.0029, pC: 0.0008 },
  BEL: { pG: 0.9723, pR: 0.5705, pQ: 0.2887, pS: 0.1702, pF: 0.0846, pC: 0.0362 },
  BIH: { pG: 0.2703, pR: 0.1084, pQ: 0.0279, pS: 0.0066, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9757, pR: 0.7163, pQ: 0.4455, pS: 0.3093, pF: 0.1446, pC: 0.0666 },
  CAN: { pG: 0.6729, pR: 0.3282, pQ: 0.1454, pS: 0.0461, pF: 0.0096, pC: 0.002 },
  CIV: { pG: 0.7745, pR: 0.4622, pQ: 0.1899, pS: 0.075, pF: 0.013, pC: 0.0035 },
  COD: { pG: 0.2084, pR: 0.0381, pQ: 0.0074, pS: 0.0009, pF: 0.0004, pC: 0.0 },
  COL: { pG: 0.7428, pR: 0.3213, pQ: 0.1317, pS: 0.0394, pF: 0.025, pC: 0.0086 },
  CPV: { pG: 0.1325, pR: 0.0575, pQ: 0.0146, pS: 0.004, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.764, pR: 0.4089, pQ: 0.1735, pS: 0.0544, pF: 0.0357, pC: 0.0152 },
  CUW: { pG: 0.1798, pR: 0.1261, pQ: 0.0236, pS: 0.0051, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6233, pR: 0.4128, pQ: 0.1591, pS: 0.0539, pF: 0.0091, pC: 0.0014 },
  ECU: { pG: 0.8645, pR: 0.4943, pQ: 0.2168, pS: 0.0899, pF: 0.0249, pC: 0.0067 },
  EGY: { pG: 0.833, pR: 0.4761, pQ: 0.211, pS: 0.0962, pF: 0.0199, pC: 0.0045 },
  ENG: { pG: 0.9044, pR: 0.6223, pQ: 0.405, pS: 0.1916, pF: 0.1437, pC: 0.081 },
  ESP: { pG: 0.9767, pR: 0.7741, pQ: 0.5904, pS: 0.4245, pF: 0.3092, pC: 0.1918 },
  FRA: { pG: 0.9358, pR: 0.7102, pQ: 0.4419, pS: 0.2899, pF: 0.2296, pC: 0.1445 },
  GER: { pG: 0.9692, pR: 0.6213, pQ: 0.3793, pS: 0.1754, pF: 0.0861, pC: 0.0384 },
  GHA: { pG: 0.0521, pR: 0.0065, pQ: 0.001, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1364, pR: 0.1044, pQ: 0.0234, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8943, pR: 0.4711, pQ: 0.2222, pS: 0.115, pF: 0.0329, pC: 0.0098 },
  IRQ: { pG: 0.1162, pR: 0.0187, pQ: 0.0016, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1099, pR: 0.0101, pQ: 0.0006, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.723, pR: 0.4052, pQ: 0.1882, pS: 0.0691, pF: 0.0284, pC: 0.01 },
  KOR: { pG: 0.8112, pR: 0.5334, pQ: 0.254, pS: 0.1008, pF: 0.0223, pC: 0.0073 },
  KSA: { pG: 0.2112, pR: 0.094, pQ: 0.0264, pS: 0.0074, pF: 0.0008, pC: 0.0001 },
  MAR: { pG: 0.9727, pR: 0.7068, pQ: 0.4216, pS: 0.2895, pF: 0.133, pC: 0.0644 },
  MEX: { pG: 0.9235, pR: 0.6598, pQ: 0.4225, pS: 0.204, pF: 0.0704, pC: 0.0262 },
  NED: { pG: 0.8675, pR: 0.6056, pQ: 0.3904, pS: 0.1847, pF: 0.1068, pC: 0.052 },
  NOR: { pG: 0.2749, pR: 0.0679, pQ: 0.01, pS: 0.0014, pF: 0.001, pC: 0.0003 },
  NZL: { pG: 0.1517, pR: 0.1075, pQ: 0.0202, pS: 0.004, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2795, pR: 0.088, pQ: 0.0207, pS: 0.0026, pF: 0.001, pC: 0.0003 },
  PAR: { pG: 0.3634, pR: 0.1383, pQ: 0.0527, pS: 0.0207, pF: 0.0033, pC: 0.0007 },
  POR: { pG: 0.8645, pR: 0.4813, pQ: 0.2552, pS: 0.1019, pF: 0.0679, pC: 0.0341 },
  QAT: { pG: 0.428, pR: 0.1762, pQ: 0.0536, pS: 0.0129, pF: 0.0013, pC: 0.0 },
  RSA: { pG: 0.4234, pR: 0.2728, pQ: 0.0867, pS: 0.0226, pF: 0.0017, pC: 0.0003 },
  SCO: { pG: 0.6248, pR: 0.481, pQ: 0.207, pS: 0.076, pF: 0.0113, pC: 0.0023 },
  SEN: { pG: 0.6731, pR: 0.2872, pQ: 0.0877, pS: 0.035, pF: 0.0212, pC: 0.0088 },
  SUI: { pG: 0.8474, pR: 0.5084, pQ: 0.3046, pS: 0.1254, pF: 0.0416, pC: 0.0153 },
  SWE: { pG: 0.3421, pR: 0.1594, pQ: 0.053, pS: 0.0182, pF: 0.0033, pC: 0.0005 },
  TUN: { pG: 0.2794, pR: 0.1259, pQ: 0.0397, pS: 0.0111, pF: 0.0008, pC: 0.0 },
  TUR: { pG: 0.5984, pR: 0.2594, pQ: 0.1125, pS: 0.0539, pF: 0.0141, pC: 0.0039 },
  URU: { pG: 0.8283, pR: 0.4492, pQ: 0.1456, pS: 0.07, pF: 0.031, pC: 0.012 },
  USA: { pG: 0.7621, pR: 0.366, pQ: 0.1852, pS: 0.1079, pF: 0.0391, pC: 0.0126 },
  UZB: { pG: 0.1843, pR: 0.0336, pQ: 0.0055, pS: 0.0007, pF: 0.0004, pC: 0.0002 },
};
