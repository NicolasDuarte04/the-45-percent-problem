// Auto-generated from M2 batch batch_20260617_125532Z on 2026-06-17T12:55:32Z.
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
  ALG: { pG: 0.4309, pR: 0.0977, pQ: 0.0154, pS: 0.0032, pF: 0.0011, pC: 0.0005 },
  ARG: { pG: 0.9515, pR: 0.683, pQ: 0.4213, pS: 0.2696, pF: 0.2189, pC: 0.1422 },
  AUS: { pG: 0.5553, pR: 0.2314, pQ: 0.1003, pS: 0.0494, pF: 0.0104, pC: 0.0025 },
  AUT: { pG: 0.512, pR: 0.1384, pQ: 0.0282, pS: 0.0085, pF: 0.0044, pC: 0.0016 },
  BEL: { pG: 0.9742, pR: 0.5719, pQ: 0.2965, pS: 0.1789, pF: 0.0865, pC: 0.0378 },
  BIH: { pG: 0.2679, pR: 0.1056, pQ: 0.0266, pS: 0.0045, pF: 0.0004, pC: 0.0001 },
  BRA: { pG: 0.9732, pR: 0.7008, pQ: 0.4279, pS: 0.2988, pF: 0.1429, pC: 0.065 },
  CAN: { pG: 0.6755, pR: 0.3382, pQ: 0.1511, pS: 0.0544, pF: 0.0117, pC: 0.0028 },
  CIV: { pG: 0.7655, pR: 0.47, pQ: 0.1912, pS: 0.0754, pF: 0.0132, pC: 0.0026 },
  COD: { pG: 0.208, pR: 0.0408, pQ: 0.0061, pS: 0.001, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7419, pR: 0.3265, pQ: 0.1401, pS: 0.0418, pF: 0.0269, pC: 0.0115 },
  CPV: { pG: 0.1331, pR: 0.0571, pQ: 0.0142, pS: 0.004, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7644, pR: 0.4022, pQ: 0.1667, pS: 0.0557, pF: 0.035, pC: 0.0161 },
  CUW: { pG: 0.1779, pR: 0.121, pQ: 0.0226, pS: 0.0039, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6216, pR: 0.3994, pQ: 0.1623, pS: 0.0557, pF: 0.0093, pC: 0.002 },
  ECU: { pG: 0.8695, pR: 0.4988, pQ: 0.228, pS: 0.0949, pF: 0.0253, pC: 0.0075 },
  EGY: { pG: 0.8232, pR: 0.474, pQ: 0.2101, pS: 0.0965, pF: 0.0187, pC: 0.0044 },
  ENG: { pG: 0.9097, pR: 0.6249, pQ: 0.4134, pS: 0.1968, pF: 0.1509, pC: 0.0866 },
  ESP: { pG: 0.9777, pR: 0.7715, pQ: 0.5865, pS: 0.4227, pF: 0.3095, pC: 0.1862 },
  FRA: { pG: 0.9314, pR: 0.7026, pQ: 0.4353, pS: 0.2829, pF: 0.231, pC: 0.1495 },
  GER: { pG: 0.9709, pR: 0.6268, pQ: 0.3835, pS: 0.1815, pF: 0.0895, pC: 0.0389 },
  GHA: { pG: 0.0516, pR: 0.0067, pQ: 0.0005, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1327, pR: 0.106, pQ: 0.0231, pS: 0.0036, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8939, pR: 0.4763, pQ: 0.2114, pS: 0.1087, pF: 0.0278, pC: 0.0089 },
  IRQ: { pG: 0.1207, pR: 0.0182, pQ: 0.0022, pS: 0.0006, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1056, pR: 0.0112, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7165, pR: 0.4039, pQ: 0.187, pS: 0.0706, pF: 0.0306, pC: 0.0099 },
  KOR: { pG: 0.8071, pR: 0.5298, pQ: 0.2602, pS: 0.1013, pF: 0.022, pC: 0.0058 },
  KSA: { pG: 0.2167, pR: 0.0948, pQ: 0.0238, pS: 0.0064, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9711, pR: 0.704, pQ: 0.4262, pS: 0.291, pF: 0.1325, pC: 0.0622 },
  MEX: { pG: 0.9186, pR: 0.6471, pQ: 0.4164, pS: 0.1992, pF: 0.0716, pC: 0.0253 },
  NED: { pG: 0.8682, pR: 0.5926, pQ: 0.3771, pS: 0.1718, pF: 0.0934, pC: 0.0433 },
  NOR: { pG: 0.2837, pR: 0.0697, pQ: 0.011, pS: 0.0022, pF: 0.0009, pC: 0.0001 },
  NZL: { pG: 0.1576, pR: 0.1108, pQ: 0.0235, pS: 0.0048, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2743, pR: 0.0845, pQ: 0.0192, pS: 0.0037, pF: 0.0016, pC: 0.0005 },
  PAR: { pG: 0.3706, pR: 0.1416, pQ: 0.0526, pS: 0.0182, pF: 0.0027, pC: 0.0011 },
  POR: { pG: 0.8594, pR: 0.4816, pQ: 0.2483, pS: 0.0979, pF: 0.0689, pC: 0.0349 },
  QAT: { pG: 0.426, pR: 0.1907, pQ: 0.0594, pS: 0.0155, pF: 0.0021, pC: 0.0004 },
  RSA: { pG: 0.4336, pR: 0.28, pQ: 0.0892, pS: 0.0246, pF: 0.0025, pC: 0.0004 },
  SCO: { pG: 0.6256, pR: 0.4833, pQ: 0.2013, pS: 0.0755, pF: 0.0081, pC: 0.0011 },
  SEN: { pG: 0.6642, pR: 0.2792, pQ: 0.0859, pS: 0.0353, pF: 0.0216, pC: 0.0075 },
  SUI: { pG: 0.8497, pR: 0.5092, pQ: 0.2976, pS: 0.1234, pF: 0.0413, pC: 0.0127 },
  SWE: { pG: 0.3447, pR: 0.1554, pQ: 0.0557, pS: 0.0175, pF: 0.0026, pC: 0.0007 },
  TUN: { pG: 0.2868, pR: 0.1315, pQ: 0.041, pS: 0.0122, pF: 0.0016, pC: 0.0002 },
  TUR: { pG: 0.5995, pR: 0.2567, pQ: 0.1107, pS: 0.0504, pF: 0.012, pC: 0.0029 },
  URU: { pG: 0.8236, pR: 0.4436, pQ: 0.1479, pS: 0.0715, pF: 0.0309, pC: 0.0108 },
  USA: { pG: 0.772, pR: 0.3762, pQ: 0.1951, pS: 0.1132, pF: 0.038, pC: 0.0135 },
  UZB: { pG: 0.1907, pR: 0.0328, pQ: 0.0057, pS: 0.0007, pF: 0.0002, pC: 0.0 },
};
