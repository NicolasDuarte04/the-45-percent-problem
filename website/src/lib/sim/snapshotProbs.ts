// Auto-generated from M2 batch batch_20260620_111450Z on 2026-06-20T11:14:50Z.
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
  ALG: { pG: 0.4196, pR: 0.0955, pQ: 0.0177, pS: 0.005, pF: 0.0023, pC: 0.0004 },
  ARG: { pG: 0.9527, pR: 0.6802, pQ: 0.4205, pS: 0.2681, pF: 0.2162, pC: 0.1378 },
  AUS: { pG: 0.5634, pR: 0.2316, pQ: 0.101, pS: 0.0468, pF: 0.0103, pC: 0.0025 },
  AUT: { pG: 0.5163, pR: 0.1379, pQ: 0.0273, pS: 0.0073, pF: 0.003, pC: 0.0006 },
  BEL: { pG: 0.9749, pR: 0.5694, pQ: 0.2888, pS: 0.1737, pF: 0.086, pC: 0.038 },
  BIH: { pG: 0.2659, pR: 0.1072, pQ: 0.0283, pS: 0.0065, pF: 0.0007, pC: 0.0 },
  BRA: { pG: 0.9704, pR: 0.7036, pQ: 0.4294, pS: 0.2926, pF: 0.1364, pC: 0.066 },
  CAN: { pG: 0.6747, pR: 0.3257, pQ: 0.1405, pS: 0.0456, pF: 0.0091, pC: 0.002 },
  CIV: { pG: 0.7701, pR: 0.4654, pQ: 0.192, pS: 0.0769, pF: 0.0122, pC: 0.0029 },
  COD: { pG: 0.2085, pR: 0.0397, pQ: 0.0081, pS: 0.0009, pF: 0.0005, pC: 0.0002 },
  COL: { pG: 0.7488, pR: 0.3273, pQ: 0.1309, pS: 0.0414, pF: 0.024, pC: 0.009 },
  CPV: { pG: 0.1307, pR: 0.0576, pQ: 0.0121, pS: 0.0027, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7607, pR: 0.4176, pQ: 0.1774, pS: 0.0594, pF: 0.0378, pC: 0.0162 },
  CUW: { pG: 0.1745, pR: 0.1181, pQ: 0.0215, pS: 0.0036, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6215, pR: 0.4074, pQ: 0.1577, pS: 0.0524, pF: 0.0072, pC: 0.0015 },
  ECU: { pG: 0.8724, pR: 0.5041, pQ: 0.2329, pS: 0.0974, pF: 0.0264, pC: 0.0077 },
  EGY: { pG: 0.824, pR: 0.4687, pQ: 0.2034, pS: 0.0945, pF: 0.0179, pC: 0.0048 },
  ENG: { pG: 0.9094, pR: 0.6309, pQ: 0.4098, pS: 0.1994, pF: 0.1523, pC: 0.0899 },
  ESP: { pG: 0.9767, pR: 0.7787, pQ: 0.589, pS: 0.4251, pF: 0.3043, pC: 0.1871 },
  FRA: { pG: 0.9306, pR: 0.6999, pQ: 0.4322, pS: 0.2779, pF: 0.2247, pC: 0.1473 },
  GER: { pG: 0.9725, pR: 0.6259, pQ: 0.3906, pS: 0.1786, pF: 0.0904, pC: 0.0373 },
  GHA: { pG: 0.0483, pR: 0.0059, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.136, pR: 0.1054, pQ: 0.0245, pS: 0.0033, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.896, pR: 0.4783, pQ: 0.2139, pS: 0.11, pF: 0.0298, pC: 0.0089 },
  IRQ: { pG: 0.1227, pR: 0.0207, pQ: 0.002, pS: 0.0004, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.1114, pR: 0.0115, pQ: 0.0005, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7123, pR: 0.4079, pQ: 0.1909, pS: 0.0716, pF: 0.031, pC: 0.0104 },
  KOR: { pG: 0.8089, pR: 0.5328, pQ: 0.2626, pS: 0.1068, pF: 0.0263, pC: 0.0068 },
  KSA: { pG: 0.2103, pR: 0.0935, pQ: 0.0255, pS: 0.0072, pF: 0.0009, pC: 0.0001 },
  MAR: { pG: 0.9699, pR: 0.706, pQ: 0.4298, pS: 0.2969, pF: 0.1363, pC: 0.0632 },
  MEX: { pG: 0.9231, pR: 0.6601, pQ: 0.4213, pS: 0.2, pF: 0.0706, pC: 0.0262 },
  NED: { pG: 0.8675, pR: 0.5955, pQ: 0.3762, pS: 0.1753, pF: 0.0994, pC: 0.0438 },
  NOR: { pG: 0.2827, pR: 0.0714, pQ: 0.0132, pS: 0.0028, pF: 0.0012, pC: 0.0003 },
  NZL: { pG: 0.1535, pR: 0.1115, pQ: 0.0219, pS: 0.004, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2816, pR: 0.0854, pQ: 0.0184, pS: 0.0028, pF: 0.0009, pC: 0.0003 },
  PAR: { pG: 0.3659, pR: 0.1339, pQ: 0.0487, pS: 0.0175, pF: 0.0025, pC: 0.0003 },
  POR: { pG: 0.8533, pR: 0.4645, pQ: 0.25, pS: 0.1013, pF: 0.0694, pC: 0.0333 },
  QAT: { pG: 0.4303, pR: 0.1808, pQ: 0.0558, pS: 0.0124, pF: 0.0014, pC: 0.0003 },
  RSA: { pG: 0.4346, pR: 0.2842, pQ: 0.0924, pS: 0.0234, pF: 0.0018, pC: 0.0003 },
  SCO: { pG: 0.6341, pR: 0.4884, pQ: 0.21, pS: 0.0822, pF: 0.011, pC: 0.0021 },
  SEN: { pG: 0.664, pR: 0.2829, pQ: 0.0866, pS: 0.0325, pF: 0.0194, pC: 0.0083 },
  SUI: { pG: 0.841, pR: 0.5018, pQ: 0.2997, pS: 0.1276, pF: 0.0425, pC: 0.0148 },
  SWE: { pG: 0.3486, pR: 0.1581, pQ: 0.0518, pS: 0.0159, pF: 0.0038, pC: 0.0005 },
  TUN: { pG: 0.2821, pR: 0.125, pQ: 0.0409, pS: 0.0133, pF: 0.0021, pC: 0.0004 },
  TUR: { pG: 0.5965, pR: 0.261, pQ: 0.1153, pS: 0.0582, pF: 0.0172, pC: 0.0048 },
  URU: { pG: 0.8339, pR: 0.4423, pQ: 0.1486, pS: 0.0741, pF: 0.0334, pC: 0.0116 },
  USA: { pG: 0.7638, pR: 0.3701, pQ: 0.183, pS: 0.1039, pF: 0.0368, pC: 0.0121 },
  UZB: { pG: 0.1894, pR: 0.0287, pQ: 0.005, pS: 0.0007, pF: 0.0001, pC: 0.0 },
};
