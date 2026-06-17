// Auto-generated from M2 batch batch_20260617_163754Z on 2026-06-17T16:37:54Z.
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
  ALG: { pG: 0.4232, pR: 0.1009, pQ: 0.0202, pS: 0.0039, pF: 0.002, pC: 0.0008 },
  ARG: { pG: 0.9538, pR: 0.6753, pQ: 0.4229, pS: 0.2802, pF: 0.225, pC: 0.1416 },
  AUS: { pG: 0.5528, pR: 0.2333, pQ: 0.0993, pS: 0.0456, pF: 0.0113, pC: 0.0028 },
  AUT: { pG: 0.5155, pR: 0.1369, pQ: 0.0258, pS: 0.0067, pF: 0.0033, pC: 0.0005 },
  BEL: { pG: 0.9729, pR: 0.566, pQ: 0.2815, pS: 0.1692, pF: 0.0795, pC: 0.0357 },
  BIH: { pG: 0.266, pR: 0.1017, pQ: 0.0264, pS: 0.0048, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.974, pR: 0.7095, pQ: 0.4421, pS: 0.299, pF: 0.1399, pC: 0.0682 },
  CAN: { pG: 0.6821, pR: 0.3383, pQ: 0.1478, pS: 0.0468, pF: 0.0107, pC: 0.0026 },
  CIV: { pG: 0.7629, pR: 0.4633, pQ: 0.1895, pS: 0.0729, pF: 0.0124, pC: 0.003 },
  COD: { pG: 0.2117, pR: 0.0387, pQ: 0.006, pS: 0.0009, pF: 0.0005, pC: 0.0 },
  COL: { pG: 0.7491, pR: 0.3264, pQ: 0.1341, pS: 0.0394, pF: 0.025, pC: 0.0104 },
  CPV: { pG: 0.134, pR: 0.0586, pQ: 0.013, pS: 0.0033, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7672, pR: 0.4035, pQ: 0.1751, pS: 0.0573, pF: 0.0353, pC: 0.0166 },
  CUW: { pG: 0.1813, pR: 0.1217, pQ: 0.0223, pS: 0.0039, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6258, pR: 0.4062, pQ: 0.1626, pS: 0.0549, pF: 0.0081, pC: 0.0015 },
  ECU: { pG: 0.8625, pR: 0.4957, pQ: 0.2211, pS: 0.0967, pF: 0.0232, pC: 0.006 },
  EGY: { pG: 0.8248, pR: 0.4788, pQ: 0.2119, pS: 0.1, pF: 0.0213, pC: 0.0054 },
  ENG: { pG: 0.9083, pR: 0.6286, pQ: 0.4097, pS: 0.1924, pF: 0.1464, pC: 0.0839 },
  ESP: { pG: 0.9789, pR: 0.7748, pQ: 0.5904, pS: 0.4291, pF: 0.3192, pC: 0.1946 },
  FRA: { pG: 0.9332, pR: 0.7028, pQ: 0.4291, pS: 0.2807, pF: 0.2273, pC: 0.147 },
  GER: { pG: 0.9726, pR: 0.6238, pQ: 0.3814, pS: 0.173, pF: 0.0863, pC: 0.0378 },
  GHA: { pG: 0.049, pR: 0.0058, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1379, pR: 0.11, pQ: 0.0232, pS: 0.0044, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8989, pR: 0.4774, pQ: 0.2173, pS: 0.1094, pF: 0.0273, pC: 0.008 },
  IRQ: { pG: 0.124, pR: 0.0189, pQ: 0.002, pS: 0.0005, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1075, pR: 0.0105, pQ: 0.0009, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7148, pR: 0.405, pQ: 0.1919, pS: 0.0697, pF: 0.0279, pC: 0.0088 },
  KOR: { pG: 0.8038, pR: 0.5272, pQ: 0.2537, pS: 0.1013, pF: 0.0255, pC: 0.0067 },
  KSA: { pG: 0.2169, pR: 0.0958, pQ: 0.0264, pS: 0.0097, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9692, pR: 0.7014, pQ: 0.4195, pS: 0.2821, pF: 0.1317, pC: 0.0576 },
  MEX: { pG: 0.924, pR: 0.6616, pQ: 0.4262, pS: 0.2098, pF: 0.0725, pC: 0.0258 },
  NED: { pG: 0.8699, pR: 0.5983, pQ: 0.3803, pS: 0.1786, pF: 0.102, pC: 0.0473 },
  NOR: { pG: 0.2766, pR: 0.0712, pQ: 0.0105, pS: 0.0028, pF: 0.0011, pC: 0.0002 },
  NZL: { pG: 0.1498, pR: 0.1061, pQ: 0.0201, pS: 0.0044, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2755, pR: 0.0856, pQ: 0.0205, pS: 0.0029, pF: 0.0009, pC: 0.0004 },
  PAR: { pG: 0.3701, pR: 0.1434, pQ: 0.0536, pS: 0.0196, pF: 0.003, pC: 0.0005 },
  POR: { pG: 0.8528, pR: 0.4766, pQ: 0.2491, pS: 0.096, pF: 0.0678, pC: 0.0338 },
  QAT: { pG: 0.4258, pR: 0.1797, pQ: 0.057, pS: 0.0143, pF: 0.0023, pC: 0.0002 },
  RSA: { pG: 0.4326, pR: 0.2819, pQ: 0.0881, pS: 0.0244, pF: 0.0025, pC: 0.0004 },
  SCO: { pG: 0.6257, pR: 0.478, pQ: 0.209, pS: 0.0778, pF: 0.0104, pC: 0.0027 },
  SEN: { pG: 0.6662, pR: 0.2835, pQ: 0.0886, pS: 0.0356, pF: 0.0228, pC: 0.0089 },
  SUI: { pG: 0.8399, pR: 0.5034, pQ: 0.2927, pS: 0.1287, pF: 0.0377, pC: 0.0111 },
  SWE: { pG: 0.3495, pR: 0.1641, pQ: 0.0594, pS: 0.0175, pF: 0.0024, pC: 0.0007 },
  TUN: { pG: 0.2865, pR: 0.1281, pQ: 0.0422, pS: 0.0139, pF: 0.0017, pC: 0.0001 },
  TUR: { pG: 0.6111, pR: 0.2604, pQ: 0.1157, pS: 0.0572, pF: 0.0128, pC: 0.0034 },
  URU: { pG: 0.8238, pR: 0.4425, pQ: 0.1513, pS: 0.0736, pF: 0.0339, pC: 0.0128 },
  USA: { pG: 0.7592, pR: 0.364, pQ: 0.1831, pS: 0.1044, pF: 0.0353, pC: 0.0121 },
  UZB: { pG: 0.1864, pR: 0.0348, pQ: 0.005, pS: 0.0007, pF: 0.0001, pC: 0.0001 },
};
