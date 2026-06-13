// Auto-generated from M2 batch batch_20260613_095836Z on 2026-06-13T09:58:36Z.
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
  ALG: { pG: 0.4266, pR: 0.1029, pQ: 0.0169, pS: 0.0038, pF: 0.0017, pC: 0.0004 },
  ARG: { pG: 0.9499, pR: 0.6708, pQ: 0.4174, pS: 0.2753, pF: 0.2231, pC: 0.1415 },
  AUS: { pG: 0.5657, pR: 0.2318, pQ: 0.0979, pS: 0.0431, pF: 0.0104, pC: 0.0031 },
  AUT: { pG: 0.5131, pR: 0.1416, pQ: 0.0295, pS: 0.0082, pF: 0.0035, pC: 0.0009 },
  BEL: { pG: 0.9734, pR: 0.5581, pQ: 0.286, pS: 0.1678, pF: 0.0846, pC: 0.0346 },
  BIH: { pG: 0.2656, pR: 0.1062, pQ: 0.03, pS: 0.0065, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9746, pR: 0.716, pQ: 0.4393, pS: 0.3016, pF: 0.1397, pC: 0.0656 },
  CAN: { pG: 0.6823, pR: 0.3441, pQ: 0.154, pS: 0.0507, pF: 0.0109, pC: 0.0034 },
  CIV: { pG: 0.7739, pR: 0.4702, pQ: 0.1937, pS: 0.0761, pF: 0.0132, pC: 0.0029 },
  COD: { pG: 0.2091, pR: 0.0362, pQ: 0.006, pS: 0.0007, pF: 0.0001, pC: 0.0001 },
  COL: { pG: 0.7415, pR: 0.3208, pQ: 0.1306, pS: 0.0378, pF: 0.0241, pC: 0.0106 },
  CPV: { pG: 0.1274, pR: 0.054, pQ: 0.0109, pS: 0.003, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.766, pR: 0.4126, pQ: 0.1682, pS: 0.054, pF: 0.0346, pC: 0.0138 },
  CUW: { pG: 0.1754, pR: 0.1168, pQ: 0.0206, pS: 0.0034, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6249, pR: 0.4057, pQ: 0.161, pS: 0.0526, pF: 0.008, pC: 0.0013 },
  ECU: { pG: 0.8701, pR: 0.5016, pQ: 0.2293, pS: 0.0951, pF: 0.0223, pC: 0.0062 },
  EGY: { pG: 0.8279, pR: 0.4829, pQ: 0.2095, pS: 0.0988, pF: 0.0211, pC: 0.0054 },
  ENG: { pG: 0.905, pR: 0.6366, pQ: 0.4207, pS: 0.1994, pF: 0.1527, pC: 0.0894 },
  ESP: { pG: 0.9775, pR: 0.7776, pQ: 0.5878, pS: 0.4279, pF: 0.3117, pC: 0.1884 },
  FRA: { pG: 0.9298, pR: 0.698, pQ: 0.4369, pS: 0.2827, pF: 0.2283, pC: 0.1469 },
  GER: { pG: 0.9685, pR: 0.6224, pQ: 0.3788, pS: 0.1778, pF: 0.0888, pC: 0.0392 },
  GHA: { pG: 0.0518, pR: 0.006, pQ: 0.0004, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1339, pR: 0.1049, pQ: 0.0232, pS: 0.0032, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8953, pR: 0.4714, pQ: 0.2172, pS: 0.1098, pF: 0.0285, pC: 0.0087 },
  IRQ: { pG: 0.1262, pR: 0.0211, pQ: 0.0022, pS: 0.0004, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1104, pR: 0.0101, pQ: 0.0004, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7183, pR: 0.4001, pQ: 0.1812, pS: 0.0688, pF: 0.0282, pC: 0.0097 },
  KOR: { pG: 0.8024, pR: 0.5184, pQ: 0.2526, pS: 0.1059, pF: 0.0265, pC: 0.0081 },
  KSA: { pG: 0.2139, pR: 0.0947, pQ: 0.0254, pS: 0.0078, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9735, pR: 0.7089, pQ: 0.4258, pS: 0.2872, pF: 0.13, pC: 0.0593 },
  MEX: { pG: 0.9224, pR: 0.6576, pQ: 0.4221, pS: 0.2049, pF: 0.0711, pC: 0.0261 },
  NED: { pG: 0.8714, pR: 0.6041, pQ: 0.3888, pS: 0.1787, pF: 0.1012, pC: 0.0476 },
  NOR: { pG: 0.279, pR: 0.0747, pQ: 0.0128, pS: 0.0022, pF: 0.001, pC: 0.0002 },
  NZL: { pG: 0.1562, pR: 0.1116, pQ: 0.021, pS: 0.0038, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2772, pR: 0.0836, pQ: 0.0179, pS: 0.0037, pF: 0.0019, pC: 0.0006 },
  PAR: { pG: 0.3646, pR: 0.1369, pQ: 0.0481, pS: 0.0182, pF: 0.0027, pC: 0.0007 },
  POR: { pG: 0.8599, pR: 0.472, pQ: 0.2505, pS: 0.0987, pF: 0.0679, pC: 0.0337 },
  QAT: { pG: 0.431, pR: 0.1862, pQ: 0.0576, pS: 0.015, pF: 0.002, pC: 0.0 },
  RSA: { pG: 0.4279, pR: 0.2782, pQ: 0.0894, pS: 0.0266, pF: 0.003, pC: 0.0001 },
  SCO: { pG: 0.6216, pR: 0.4772, pQ: 0.2062, pS: 0.0757, pF: 0.0099, pC: 0.002 },
  SEN: { pG: 0.665, pR: 0.2808, pQ: 0.0839, pS: 0.0322, pF: 0.0174, pC: 0.0068 },
  SUI: { pG: 0.8435, pR: 0.5036, pQ: 0.2935, pS: 0.1225, pF: 0.0401, pC: 0.0137 },
  SWE: { pG: 0.3457, pR: 0.1604, pQ: 0.0593, pS: 0.0192, pF: 0.0039, pC: 0.0007 },
  TUN: { pG: 0.2767, pR: 0.1244, pQ: 0.0396, pS: 0.0118, pF: 0.0016, pC: 0.0002 },
  TUR: { pG: 0.6024, pR: 0.2602, pQ: 0.1145, pS: 0.0555, pF: 0.0115, pC: 0.0034 },
  URU: { pG: 0.8284, pR: 0.4497, pQ: 0.1509, pS: 0.0729, pF: 0.034, pC: 0.0123 },
  USA: { pG: 0.7637, pR: 0.3641, pQ: 0.1848, pS: 0.1081, pF: 0.0376, pC: 0.0124 },
  UZB: { pG: 0.1895, pR: 0.0322, pQ: 0.0057, pS: 0.0007, pF: 0.0002, pC: 0.0 },
};
