// Auto-generated from M2 batch batch_20260617_215833Z on 2026-06-17T21:58:33Z.
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
  ALG: { pG: 0.428, pR: 0.1006, pQ: 0.0193, pS: 0.0044, pF: 0.0019, pC: 0.0004 },
  ARG: { pG: 0.9527, pR: 0.6673, pQ: 0.42, pS: 0.2732, pF: 0.2216, pC: 0.1407 },
  AUS: { pG: 0.5589, pR: 0.237, pQ: 0.0976, pS: 0.048, pF: 0.0114, pC: 0.0026 },
  AUT: { pG: 0.5048, pR: 0.1337, pQ: 0.0254, pS: 0.0067, pF: 0.0031, pC: 0.0012 },
  BEL: { pG: 0.9733, pR: 0.573, pQ: 0.2916, pS: 0.1755, pF: 0.0896, pC: 0.0399 },
  BIH: { pG: 0.2656, pR: 0.1041, pQ: 0.0255, pS: 0.0056, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.973, pR: 0.7131, pQ: 0.4376, pS: 0.3033, pF: 0.1457, pC: 0.0666 },
  CAN: { pG: 0.6832, pR: 0.3454, pQ: 0.1515, pS: 0.0503, pF: 0.0119, pC: 0.0027 },
  CIV: { pG: 0.7756, pR: 0.469, pQ: 0.1911, pS: 0.0744, pF: 0.0147, pC: 0.0033 },
  COD: { pG: 0.2129, pR: 0.04, pQ: 0.0092, pS: 0.0008, pF: 0.0004, pC: 0.0002 },
  COL: { pG: 0.7496, pR: 0.3358, pQ: 0.134, pS: 0.04, pF: 0.0233, pC: 0.0095 },
  CPV: { pG: 0.1344, pR: 0.0569, pQ: 0.0111, pS: 0.0027, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7611, pR: 0.4019, pQ: 0.1647, pS: 0.0543, pF: 0.0348, pC: 0.0169 },
  CUW: { pG: 0.1757, pR: 0.1218, pQ: 0.0245, pS: 0.0046, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6254, pR: 0.4052, pQ: 0.1559, pS: 0.0507, pF: 0.0067, pC: 0.0008 },
  ECU: { pG: 0.8674, pR: 0.4912, pQ: 0.2267, pS: 0.0941, pF: 0.0219, pC: 0.0066 },
  EGY: { pG: 0.8283, pR: 0.48, pQ: 0.2089, pS: 0.0977, pF: 0.0227, pC: 0.0063 },
  ENG: { pG: 0.9127, pR: 0.6268, pQ: 0.4154, pS: 0.1991, pF: 0.1515, pC: 0.0873 },
  ESP: { pG: 0.9787, pR: 0.7708, pQ: 0.5852, pS: 0.4268, pF: 0.3066, pC: 0.1873 },
  FRA: { pG: 0.9335, pR: 0.7141, pQ: 0.4397, pS: 0.283, pF: 0.2263, pC: 0.1437 },
  GER: { pG: 0.9723, pR: 0.621, pQ: 0.3889, pS: 0.1796, pF: 0.085, pC: 0.039 },
  GHA: { pG: 0.0498, pR: 0.0054, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1356, pR: 0.1096, pQ: 0.0253, pS: 0.004, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8956, pR: 0.4785, pQ: 0.2154, pS: 0.1108, pF: 0.03, pC: 0.0089 },
  IRQ: { pG: 0.1231, pR: 0.0179, pQ: 0.0019, pS: 0.0004, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1145, pR: 0.0115, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7096, pR: 0.4105, pQ: 0.1879, pS: 0.0694, pF: 0.0311, pC: 0.0104 },
  KOR: { pG: 0.8104, pR: 0.5186, pQ: 0.2492, pS: 0.1034, pF: 0.0248, pC: 0.0063 },
  KSA: { pG: 0.223, pR: 0.0983, pQ: 0.026, pS: 0.0087, pF: 0.0013, pC: 0.0001 },
  MAR: { pG: 0.9734, pR: 0.7033, pQ: 0.4207, pS: 0.2907, pF: 0.1288, pC: 0.0613 },
  MEX: { pG: 0.9142, pR: 0.6488, pQ: 0.4185, pS: 0.1955, pF: 0.0663, pC: 0.027 },
  NED: { pG: 0.8723, pR: 0.5983, pQ: 0.3822, pS: 0.1732, pF: 0.0996, pC: 0.0434 },
  NOR: { pG: 0.2765, pR: 0.0683, pQ: 0.0104, pS: 0.003, pF: 0.0012, pC: 0.0002 },
  NZL: { pG: 0.1462, pR: 0.1064, pQ: 0.019, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2764, pR: 0.0809, pQ: 0.0173, pS: 0.0028, pF: 0.0016, pC: 0.0004 },
  PAR: { pG: 0.3591, pR: 0.1383, pQ: 0.052, pS: 0.0211, pF: 0.0034, pC: 0.0006 },
  POR: { pG: 0.8532, pR: 0.4749, pQ: 0.2531, pS: 0.098, pF: 0.0675, pC: 0.0341 },
  QAT: { pG: 0.421, pR: 0.1803, pQ: 0.061, pS: 0.0146, pF: 0.0017, pC: 0.0002 },
  RSA: { pG: 0.4332, pR: 0.2827, pQ: 0.0917, pS: 0.0253, pF: 0.0022, pC: 0.0005 },
  SCO: { pG: 0.6296, pR: 0.4776, pQ: 0.2045, pS: 0.0762, pF: 0.0097, pC: 0.0009 },
  SEN: { pG: 0.6669, pR: 0.2866, pQ: 0.083, pS: 0.0338, pF: 0.0204, pC: 0.0096 },
  SUI: { pG: 0.847, pR: 0.5149, pQ: 0.305, pS: 0.1218, pF: 0.0412, pC: 0.0136 },
  SWE: { pG: 0.3458, pR: 0.1625, pQ: 0.057, pS: 0.0189, pF: 0.0033, pC: 0.0002 },
  TUN: { pG: 0.2813, pR: 0.1257, pQ: 0.0412, pS: 0.0131, pF: 0.0018, pC: 0.0005 },
  TUR: { pG: 0.6091, pR: 0.2528, pQ: 0.1124, pS: 0.0544, pF: 0.0146, pC: 0.0042 },
  URU: { pG: 0.8205, pR: 0.4361, pQ: 0.1433, pS: 0.0703, pF: 0.0297, pC: 0.0097 },
  USA: { pG: 0.7613, pR: 0.3683, pQ: 0.1916, pS: 0.111, pF: 0.0398, pC: 0.0129 },
  UZB: { pG: 0.1843, pR: 0.0343, pQ: 0.0059, pS: 0.0005, pF: 0.0, pC: 0.0 },
};
