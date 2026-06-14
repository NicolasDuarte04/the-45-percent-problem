// Auto-generated from M2 batch batch_20260614_192118Z on 2026-06-14T19:21:18Z.
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
  ALG: { pG: 0.4208, pR: 0.0992, pQ: 0.0171, pS: 0.0045, pF: 0.0019, pC: 0.0002 },
  ARG: { pG: 0.9561, pR: 0.6832, pQ: 0.4245, pS: 0.271, pF: 0.2179, pC: 0.1402 },
  AUS: { pG: 0.554, pR: 0.2244, pQ: 0.0902, pS: 0.0435, pF: 0.0106, pC: 0.0023 },
  AUT: { pG: 0.5143, pR: 0.1371, pQ: 0.0284, pS: 0.0085, pF: 0.0044, pC: 0.0016 },
  BEL: { pG: 0.9731, pR: 0.5622, pQ: 0.28, pS: 0.1656, pF: 0.0802, pC: 0.0343 },
  BIH: { pG: 0.2722, pR: 0.1062, pQ: 0.0282, pS: 0.0053, pF: 0.0003, pC: 0.0001 },
  BRA: { pG: 0.972, pR: 0.7138, pQ: 0.44, pS: 0.3026, pF: 0.1384, pC: 0.0644 },
  CAN: { pG: 0.6853, pR: 0.3423, pQ: 0.1495, pS: 0.0472, pF: 0.0094, pC: 0.0023 },
  CIV: { pG: 0.7697, pR: 0.471, pQ: 0.1946, pS: 0.0767, pF: 0.0136, pC: 0.0029 },
  COD: { pG: 0.2113, pR: 0.0399, pQ: 0.007, pS: 0.0011, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7417, pR: 0.3273, pQ: 0.1343, pS: 0.0408, pF: 0.0238, pC: 0.0099 },
  CPV: { pG: 0.1323, pR: 0.0565, pQ: 0.0113, pS: 0.0034, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7644, pR: 0.4164, pQ: 0.175, pS: 0.0595, pF: 0.0362, pC: 0.017 },
  CUW: { pG: 0.1768, pR: 0.1223, pQ: 0.0239, pS: 0.005, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6248, pR: 0.4067, pQ: 0.1587, pS: 0.0515, pF: 0.0061, pC: 0.0013 },
  ECU: { pG: 0.8698, pR: 0.4984, pQ: 0.2286, pS: 0.0959, pF: 0.0263, pC: 0.007 },
  EGY: { pG: 0.8281, pR: 0.4698, pQ: 0.2082, pS: 0.0965, pF: 0.0188, pC: 0.0048 },
  ENG: { pG: 0.9092, pR: 0.632, pQ: 0.4198, pS: 0.1937, pF: 0.1464, pC: 0.0828 },
  ESP: { pG: 0.9765, pR: 0.7808, pQ: 0.5956, pS: 0.431, pF: 0.3162, pC: 0.1915 },
  FRA: { pG: 0.9358, pR: 0.7132, pQ: 0.4385, pS: 0.2847, pF: 0.2313, pC: 0.1498 },
  GER: { pG: 0.9726, pR: 0.6182, pQ: 0.3802, pS: 0.1781, pF: 0.0861, pC: 0.0366 },
  GHA: { pG: 0.048, pR: 0.0043, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1345, pR: 0.1042, pQ: 0.0226, pS: 0.0036, pF: 0.0003, pC: 0.0 },
  IRN: { pG: 0.8914, pR: 0.4668, pQ: 0.2185, pS: 0.1121, pF: 0.0289, pC: 0.009 },
  IRQ: { pG: 0.1225, pR: 0.0188, pQ: 0.0021, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1088, pR: 0.0104, pQ: 0.0008, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.706, pR: 0.3979, pQ: 0.1863, pS: 0.0665, pF: 0.0264, pC: 0.0091 },
  KOR: { pG: 0.8018, pR: 0.5252, pQ: 0.2587, pS: 0.1004, pF: 0.0224, pC: 0.007 },
  KSA: { pG: 0.2159, pR: 0.0974, pQ: 0.0247, pS: 0.0072, pF: 0.0003, pC: 0.0 },
  MAR: { pG: 0.9706, pR: 0.707, pQ: 0.4287, pS: 0.2865, pF: 0.1303, pC: 0.0612 },
  MEX: { pG: 0.9192, pR: 0.6446, pQ: 0.4179, pS: 0.2032, pF: 0.0728, pC: 0.0259 },
  NED: { pG: 0.8777, pR: 0.599, pQ: 0.3826, pS: 0.1823, pF: 0.1072, pC: 0.0498 },
  NOR: { pG: 0.2814, pR: 0.071, pQ: 0.0111, pS: 0.0032, pF: 0.0013, pC: 0.0003 },
  NZL: { pG: 0.1551, pR: 0.1131, pQ: 0.0194, pS: 0.0043, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2784, pR: 0.083, pQ: 0.017, pS: 0.0024, pF: 0.0012, pC: 0.0004 },
  PAR: { pG: 0.3584, pR: 0.1417, pQ: 0.0521, pS: 0.0194, pF: 0.0032, pC: 0.0006 },
  POR: { pG: 0.8602, pR: 0.4621, pQ: 0.2411, pS: 0.0985, pF: 0.0698, pC: 0.0353 },
  QAT: { pG: 0.4174, pR: 0.1803, pQ: 0.0589, pS: 0.0142, pF: 0.0013, pC: 0.0 },
  RSA: { pG: 0.4319, pR: 0.2832, pQ: 0.0935, pS: 0.0238, pF: 0.0029, pC: 0.0005 },
  SCO: { pG: 0.6361, pR: 0.4867, pQ: 0.2053, pS: 0.0782, pF: 0.0101, pC: 0.0023 },
  SEN: { pG: 0.6603, pR: 0.2671, pQ: 0.0775, pS: 0.0313, pF: 0.0179, pC: 0.0071 },
  SUI: { pG: 0.8474, pR: 0.5115, pQ: 0.2972, pS: 0.1281, pF: 0.0417, pC: 0.0126 },
  SWE: { pG: 0.3475, pR: 0.1662, pQ: 0.0545, pS: 0.016, pF: 0.0029, pC: 0.0006 },
  TUN: { pG: 0.2799, pR: 0.127, pQ: 0.0391, pS: 0.0117, pF: 0.0025, pC: 0.0 },
  TUR: { pG: 0.6089, pR: 0.2535, pQ: 0.1111, pS: 0.0543, pF: 0.0129, pC: 0.0035 },
  URU: { pG: 0.8276, pR: 0.4534, pQ: 0.1525, pS: 0.0755, pF: 0.0348, pC: 0.0117 },
  USA: { pG: 0.7655, pR: 0.3687, pQ: 0.1874, pS: 0.1104, pF: 0.0399, pC: 0.0141 },
  UZB: { pG: 0.1868, pR: 0.035, pQ: 0.0056, pS: 0.0004, pF: 0.0002, pC: 0.0 },
};
