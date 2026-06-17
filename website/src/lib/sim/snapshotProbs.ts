// Auto-generated from M2 batch batch_20260617_205927Z on 2026-06-17T20:59:27Z.
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
  ALG: { pG: 0.4236, pR: 0.103, pQ: 0.0174, pS: 0.0047, pF: 0.0023, pC: 0.0006 },
  ARG: { pG: 0.9524, pR: 0.6826, pQ: 0.4278, pS: 0.2742, pF: 0.2237, pC: 0.1437 },
  AUS: { pG: 0.5624, pR: 0.2283, pQ: 0.0984, pS: 0.0472, pF: 0.0092, pC: 0.0023 },
  AUT: { pG: 0.5174, pR: 0.143, pQ: 0.0292, pS: 0.0081, pF: 0.0042, pC: 0.001 },
  BEL: { pG: 0.9754, pR: 0.5664, pQ: 0.2907, pS: 0.1743, pF: 0.0869, pC: 0.036 },
  BIH: { pG: 0.2691, pR: 0.1032, pQ: 0.0272, pS: 0.0052, pF: 0.0006, pC: 0.0 },
  BRA: { pG: 0.9753, pR: 0.7212, pQ: 0.435, pS: 0.2972, pF: 0.1371, pC: 0.0618 },
  CAN: { pG: 0.6845, pR: 0.3342, pQ: 0.1434, pS: 0.0502, pF: 0.01, pC: 0.0025 },
  CIV: { pG: 0.7673, pR: 0.4677, pQ: 0.1996, pS: 0.081, pF: 0.0156, pC: 0.0031 },
  COD: { pG: 0.2068, pR: 0.0383, pQ: 0.0074, pS: 0.0008, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7445, pR: 0.3274, pQ: 0.1333, pS: 0.039, pF: 0.0242, pC: 0.0094 },
  CPV: { pG: 0.1315, pR: 0.0588, pQ: 0.0123, pS: 0.0028, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7644, pR: 0.4062, pQ: 0.1702, pS: 0.0564, pF: 0.0376, pC: 0.017 },
  CUW: { pG: 0.1746, pR: 0.1204, pQ: 0.0236, pS: 0.0057, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6283, pR: 0.4072, pQ: 0.1581, pS: 0.0515, pF: 0.0056, pC: 0.0011 },
  ECU: { pG: 0.8719, pR: 0.4979, pQ: 0.2162, pS: 0.091, pF: 0.0249, pC: 0.0066 },
  EGY: { pG: 0.8226, pR: 0.4768, pQ: 0.2092, pS: 0.096, pF: 0.0188, pC: 0.0038 },
  ENG: { pG: 0.9121, pR: 0.6372, pQ: 0.4176, pS: 0.1996, pF: 0.1492, pC: 0.0878 },
  ESP: { pG: 0.9783, pR: 0.7712, pQ: 0.5801, pS: 0.4207, pF: 0.3076, pC: 0.1869 },
  FRA: { pG: 0.9329, pR: 0.698, pQ: 0.426, pS: 0.2774, pF: 0.223, pC: 0.1461 },
  GER: { pG: 0.9707, pR: 0.6286, pQ: 0.3958, pS: 0.1877, pF: 0.0913, pC: 0.0392 },
  GHA: { pG: 0.0494, pR: 0.0053, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1326, pR: 0.1052, pQ: 0.0252, pS: 0.0036, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.9001, pR: 0.4764, pQ: 0.2129, pS: 0.1083, pF: 0.0285, pC: 0.0084 },
  IRQ: { pG: 0.1217, pR: 0.0177, pQ: 0.002, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1066, pR: 0.0107, pQ: 0.0006, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7155, pR: 0.4056, pQ: 0.1937, pS: 0.0707, pF: 0.0272, pC: 0.0115 },
  KOR: { pG: 0.8031, pR: 0.5233, pQ: 0.2558, pS: 0.1012, pF: 0.0226, pC: 0.0054 },
  KSA: { pG: 0.2084, pR: 0.0915, pQ: 0.0243, pS: 0.0086, pF: 0.0004, pC: 0.0 },
  MAR: { pG: 0.9725, pR: 0.7072, pQ: 0.4319, pS: 0.2977, pF: 0.1372, pC: 0.0607 },
  MEX: { pG: 0.9215, pR: 0.665, pQ: 0.4349, pS: 0.2093, pF: 0.0769, pC: 0.0287 },
  NED: { pG: 0.8673, pR: 0.5888, pQ: 0.3716, pS: 0.1715, pF: 0.0965, pC: 0.0443 },
  NOR: { pG: 0.2755, pR: 0.0638, pQ: 0.0103, pS: 0.0028, pF: 0.0009, pC: 0.0006 },
  NZL: { pG: 0.1526, pR: 0.1073, pQ: 0.0193, pS: 0.0024, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2741, pR: 0.0811, pQ: 0.0168, pS: 0.0029, pF: 0.001, pC: 0.0001 },
  PAR: { pG: 0.3667, pR: 0.1414, pQ: 0.0543, pS: 0.0207, pF: 0.002, pC: 0.0005 },
  POR: { pG: 0.8591, pR: 0.4726, pQ: 0.248, pS: 0.0976, pF: 0.0685, pC: 0.0344 },
  QAT: { pG: 0.423, pR: 0.1768, pQ: 0.0601, pS: 0.0132, pF: 0.0018, pC: 0.0003 },
  RSA: { pG: 0.4294, pR: 0.2811, pQ: 0.0904, pS: 0.0239, pF: 0.0025, pC: 0.0004 },
  SCO: { pG: 0.6315, pR: 0.4884, pQ: 0.2062, pS: 0.0784, pF: 0.0119, pC: 0.0026 },
  SEN: { pG: 0.6699, pR: 0.2812, pQ: 0.0867, pS: 0.0352, pF: 0.0213, pC: 0.0097 },
  SUI: { pG: 0.8411, pR: 0.5092, pQ: 0.2927, pS: 0.1199, pF: 0.0395, pC: 0.0133 },
  SWE: { pG: 0.347, pR: 0.1649, pQ: 0.0592, pS: 0.0172, pF: 0.0027, pC: 0.0006 },
  TUN: { pG: 0.2857, pR: 0.1261, pQ: 0.0397, pS: 0.0105, pF: 0.0016, pC: 0.0003 },
  TUR: { pG: 0.6025, pR: 0.2586, pQ: 0.1114, pS: 0.0548, pF: 0.0123, pC: 0.0032 },
  URU: { pG: 0.8311, pR: 0.4516, pQ: 0.1518, pS: 0.0778, pF: 0.0356, pC: 0.0123 },
  USA: { pG: 0.7565, pR: 0.3497, pQ: 0.175, pS: 0.0998, pF: 0.0363, pC: 0.0137 },
  UZB: { pG: 0.1896, pR: 0.0319, pQ: 0.0061, pS: 0.0008, pF: 0.0004, pC: 0.0001 },
};
