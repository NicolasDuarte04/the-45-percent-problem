// Auto-generated from M2 batch batch_20260614_022925Z on 2026-06-14T02:29:25Z.
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
  ALG: { pG: 0.4285, pR: 0.107, pQ: 0.0193, pS: 0.0044, pF: 0.0014, pC: 0.0004 },
  ARG: { pG: 0.9524, pR: 0.6757, pQ: 0.4212, pS: 0.274, pF: 0.2197, pC: 0.1407 },
  AUS: { pG: 0.5629, pR: 0.2303, pQ: 0.0957, pS: 0.0454, pF: 0.0095, pC: 0.0029 },
  AUT: { pG: 0.5077, pR: 0.1375, pQ: 0.0272, pS: 0.0089, pF: 0.0041, pC: 0.0011 },
  BEL: { pG: 0.9736, pR: 0.5631, pQ: 0.2853, pS: 0.1705, pF: 0.0798, pC: 0.0348 },
  BIH: { pG: 0.2721, pR: 0.1075, pQ: 0.025, pS: 0.006, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9741, pR: 0.7085, pQ: 0.4381, pS: 0.3015, pF: 0.1405, pC: 0.0642 },
  CAN: { pG: 0.6852, pR: 0.3416, pQ: 0.1443, pS: 0.0416, pF: 0.0098, pC: 0.0025 },
  CIV: { pG: 0.7674, pR: 0.4684, pQ: 0.1945, pS: 0.0757, pF: 0.0127, pC: 0.003 },
  COD: { pG: 0.2142, pR: 0.0374, pQ: 0.006, pS: 0.0008, pF: 0.0004, pC: 0.0001 },
  COL: { pG: 0.7464, pR: 0.3364, pQ: 0.1385, pS: 0.0422, pF: 0.0258, pC: 0.011 },
  CPV: { pG: 0.1308, pR: 0.0582, pQ: 0.0118, pS: 0.0031, pF: 0.0004, pC: 0.0001 },
  CRO: { pG: 0.7558, pR: 0.4085, pQ: 0.1746, pS: 0.0583, pF: 0.0374, pC: 0.016 },
  CUW: { pG: 0.1734, pR: 0.116, pQ: 0.0219, pS: 0.0058, pF: 0.0002, pC: 0.0001 },
  CZE: { pG: 0.6323, pR: 0.4078, pQ: 0.1564, pS: 0.0531, pF: 0.0075, pC: 0.0012 },
  ECU: { pG: 0.8709, pR: 0.4984, pQ: 0.2262, pS: 0.0912, pF: 0.0233, pC: 0.0075 },
  EGY: { pG: 0.8334, pR: 0.4781, pQ: 0.2048, pS: 0.0956, pF: 0.0207, pC: 0.0048 },
  ENG: { pG: 0.9057, pR: 0.6316, pQ: 0.4102, pS: 0.1952, pF: 0.1491, pC: 0.0915 },
  ESP: { pG: 0.9801, pR: 0.7727, pQ: 0.5883, pS: 0.4305, pF: 0.3074, pC: 0.1867 },
  FRA: { pG: 0.9339, pR: 0.6993, pQ: 0.4348, pS: 0.2843, pF: 0.2336, pC: 0.1512 },
  GER: { pG: 0.97, pR: 0.6276, pQ: 0.3793, pS: 0.1729, pF: 0.0845, pC: 0.0321 },
  GHA: { pG: 0.0489, pR: 0.0047, pQ: 0.0009, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1322, pR: 0.1046, pQ: 0.024, pS: 0.0035, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8975, pR: 0.4831, pQ: 0.2212, pS: 0.1135, pF: 0.0314, pC: 0.0096 },
  IRQ: { pG: 0.1268, pR: 0.02, pQ: 0.0016, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1114, pR: 0.0099, pQ: 0.0005, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7137, pR: 0.4054, pQ: 0.1912, pS: 0.0723, pF: 0.0282, pC: 0.0096 },
  KOR: { pG: 0.8037, pR: 0.5217, pQ: 0.2558, pS: 0.1019, pF: 0.0248, pC: 0.0065 },
  KSA: { pG: 0.2072, pR: 0.0922, pQ: 0.0232, pS: 0.0065, pF: 0.0001, pC: 0.0 },
  MAR: { pG: 0.9705, pR: 0.7099, pQ: 0.4268, pS: 0.2905, pF: 0.1358, pC: 0.0643 },
  MEX: { pG: 0.9178, pR: 0.6508, pQ: 0.419, pS: 0.1997, pF: 0.0687, pC: 0.0259 },
  NED: { pG: 0.8755, pR: 0.5967, pQ: 0.3887, pS: 0.1809, pF: 0.1042, pC: 0.0468 },
  NOR: { pG: 0.2751, pR: 0.0712, pQ: 0.0133, pS: 0.0034, pF: 0.001, pC: 0.0001 },
  NZL: { pG: 0.1469, pR: 0.1076, pQ: 0.019, pS: 0.0035, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2896, pR: 0.0877, pQ: 0.0194, pS: 0.0032, pF: 0.0018, pC: 0.0004 },
  PAR: { pG: 0.3624, pR: 0.1397, pQ: 0.0546, pS: 0.0213, pF: 0.0038, pC: 0.001 },
  POR: { pG: 0.8535, pR: 0.4643, pQ: 0.2455, pS: 0.0939, pF: 0.0636, pC: 0.0311 },
  QAT: { pG: 0.413, pR: 0.1752, pQ: 0.057, pS: 0.0128, pF: 0.0019, pC: 0.0005 },
  RSA: { pG: 0.4292, pR: 0.2854, pQ: 0.0942, pS: 0.0268, pF: 0.0025, pC: 0.0006 },
  SCO: { pG: 0.6282, pR: 0.4815, pQ: 0.2135, pS: 0.0825, pF: 0.012, pC: 0.0028 },
  SEN: { pG: 0.6642, pR: 0.2794, pQ: 0.0821, pS: 0.0306, pF: 0.0184, pC: 0.0071 },
  SUI: { pG: 0.8467, pR: 0.51, pQ: 0.3039, pS: 0.1321, pF: 0.0457, pC: 0.0137 },
  SWE: { pG: 0.3458, pR: 0.1601, pQ: 0.0538, pS: 0.0152, pF: 0.0027, pC: 0.0007 },
  TUN: { pG: 0.2833, pR: 0.1274, pQ: 0.043, pS: 0.0137, pF: 0.0015, pC: 0.0002 },
  TUR: { pG: 0.6073, pR: 0.2581, pQ: 0.1049, pS: 0.0495, pF: 0.014, pC: 0.0036 },
  URU: { pG: 0.8305, pR: 0.445, pQ: 0.1478, pS: 0.0726, pF: 0.0324, pC: 0.0123 },
  USA: { pG: 0.7624, pR: 0.3674, pQ: 0.1868, pS: 0.1083, pF: 0.0371, pC: 0.0113 },
  UZB: { pG: 0.1859, pR: 0.0294, pQ: 0.0049, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
