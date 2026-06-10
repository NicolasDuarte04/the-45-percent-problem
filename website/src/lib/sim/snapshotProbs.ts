// Auto-generated from M2 batch batch_20260610_172807Z on 2026-06-10T17:28:07Z.
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
  ALG: { pG: 0.4185, pR: 0.1021, pQ: 0.0187, pS: 0.0056, pF: 0.0016, pC: 0.0007 },
  ARG: { pG: 0.9543, pR: 0.67, pQ: 0.4172, pS: 0.2727, pF: 0.2223, pC: 0.1386 },
  AUS: { pG: 0.6239, pR: 0.2915, pQ: 0.1287, pS: 0.0613, pF: 0.0133, pC: 0.0035 },
  AUT: { pG: 0.5154, pR: 0.1415, pQ: 0.0284, pS: 0.0068, pF: 0.0031, pC: 0.001 },
  BEL: { pG: 0.9767, pR: 0.5645, pQ: 0.2876, pS: 0.1735, pF: 0.0827, pC: 0.038 },
  BIH: { pG: 0.2623, pR: 0.1045, pQ: 0.0262, pS: 0.0045, pF: 0.0003, pC: 0.0001 },
  BRA: { pG: 0.972, pR: 0.7024, pQ: 0.4278, pS: 0.2955, pF: 0.138, pC: 0.0647 },
  CAN: { pG: 0.6774, pR: 0.3295, pQ: 0.1412, pS: 0.0444, pF: 0.009, pC: 0.0019 },
  CIV: { pG: 0.7741, pR: 0.4741, pQ: 0.1948, pS: 0.0789, pF: 0.0126, pC: 0.0027 },
  COD: { pG: 0.2067, pR: 0.0394, pQ: 0.0076, pS: 0.0011, pF: 0.0004, pC: 0.0001 },
  COL: { pG: 0.7471, pR: 0.3278, pQ: 0.1309, pS: 0.0398, pF: 0.0245, pC: 0.0102 },
  CPV: { pG: 0.1357, pR: 0.0563, pQ: 0.0117, pS: 0.0022, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7616, pR: 0.4071, pQ: 0.1731, pS: 0.0563, pF: 0.0364, pC: 0.0171 },
  CUW: { pG: 0.1843, pR: 0.1207, pQ: 0.0255, pS: 0.0047, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6308, pR: 0.412, pQ: 0.159, pS: 0.0538, pF: 0.0076, pC: 0.0016 },
  ECU: { pG: 0.8725, pR: 0.5012, pQ: 0.225, pS: 0.0971, pF: 0.0251, pC: 0.0096 },
  EGY: { pG: 0.8295, pR: 0.4807, pQ: 0.2095, pS: 0.0978, pF: 0.019, pC: 0.004 },
  ENG: { pG: 0.9081, pR: 0.6349, pQ: 0.4076, pS: 0.1915, pF: 0.1458, pC: 0.085 },
  ESP: { pG: 0.9752, pR: 0.7701, pQ: 0.5878, pS: 0.4213, pF: 0.3091, pC: 0.192 },
  FRA: { pG: 0.9315, pR: 0.701, pQ: 0.4361, pS: 0.2875, pF: 0.2333, pC: 0.1472 },
  GER: { pG: 0.9707, pR: 0.6348, pQ: 0.3839, pS: 0.18, pF: 0.0893, pC: 0.0396 },
  GHA: { pG: 0.051, pR: 0.0059, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1273, pR: 0.0915, pQ: 0.0205, pS: 0.0029, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8938, pR: 0.4775, pQ: 0.2186, pS: 0.1126, pF: 0.031, pC: 0.0084 },
  IRQ: { pG: 0.1242, pR: 0.0192, pQ: 0.0017, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1118, pR: 0.012, pQ: 0.0006, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7039, pR: 0.394, pQ: 0.1841, pS: 0.0677, pF: 0.0295, pC: 0.0103 },
  KOR: { pG: 0.8113, pR: 0.5317, pQ: 0.2592, pS: 0.1002, pF: 0.0238, pC: 0.0057 },
  KSA: { pG: 0.2085, pR: 0.0927, pQ: 0.0244, pS: 0.0076, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9699, pR: 0.6908, pQ: 0.4041, pS: 0.2796, pF: 0.1306, pC: 0.0585 },
  MEX: { pG: 0.9186, pR: 0.654, pQ: 0.4195, pS: 0.1947, pF: 0.0652, pC: 0.0243 },
  NED: { pG: 0.8647, pR: 0.5927, pQ: 0.3841, pS: 0.1744, pF: 0.0979, pC: 0.0477 },
  NOR: { pG: 0.2731, pR: 0.0655, pQ: 0.0124, pS: 0.002, pF: 0.0007, pC: 0.0 },
  NZL: { pG: 0.1564, pR: 0.1118, pQ: 0.0211, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2793, pR: 0.0828, pQ: 0.0193, pS: 0.0035, pF: 0.0012, pC: 0.0006 },
  PAR: { pG: 0.4387, pR: 0.2104, pQ: 0.0845, pS: 0.0324, pF: 0.0054, pC: 0.0011 },
  POR: { pG: 0.8622, pR: 0.4701, pQ: 0.2556, pS: 0.1026, pF: 0.0696, pC: 0.0331 },
  QAT: { pG: 0.4321, pR: 0.1854, pQ: 0.0578, pS: 0.0158, pF: 0.0012, pC: 0.0002 },
  RSA: { pG: 0.4275, pR: 0.2785, pQ: 0.0869, pS: 0.0233, pF: 0.0029, pC: 0.0003 },
  SCO: { pG: 0.3856, pR: 0.2769, pQ: 0.1156, pS: 0.0429, pF: 0.0067, pC: 0.001 },
  SEN: { pG: 0.6712, pR: 0.2887, pQ: 0.0849, pS: 0.0297, pF: 0.0195, pC: 0.0075 },
  SUI: { pG: 0.84, pR: 0.5044, pQ: 0.2961, pS: 0.1224, pF: 0.0398, pC: 0.0116 },
  SWE: { pG: 0.3487, pR: 0.1556, pQ: 0.0535, pS: 0.0152, pF: 0.0031, pC: 0.0005 },
  TUN: { pG: 0.2811, pR: 0.1269, pQ: 0.0392, pS: 0.0117, pF: 0.0017, pC: 0.0002 },
  TUR: { pG: 0.6685, pR: 0.3208, pQ: 0.1555, pS: 0.0792, pF: 0.0201, pC: 0.0044 },
  URU: { pG: 0.8242, pR: 0.4464, pQ: 0.1492, pS: 0.0733, pF: 0.0317, pC: 0.0115 },
  USA: { pG: 0.8141, pR: 0.4157, pQ: 0.2174, pS: 0.126, pF: 0.0433, pC: 0.0154 },
  UZB: { pG: 0.184, pR: 0.032, pQ: 0.0055, pS: 0.0006, pF: 0.0002, pC: 0.0 },
};
