// Auto-generated from M2 batch batch_20260612_121632Z on 2026-06-12T12:16:32Z.
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
  ALG: { pG: 0.4299, pR: 0.1016, pQ: 0.0184, pS: 0.0043, pF: 0.0023, pC: 0.0007 },
  ARG: { pG: 0.953, pR: 0.6735, pQ: 0.4176, pS: 0.2745, pF: 0.2195, pC: 0.1397 },
  AUS: { pG: 0.5539, pR: 0.2305, pQ: 0.0957, pS: 0.0438, pF: 0.0098, pC: 0.003 },
  AUT: { pG: 0.507, pR: 0.1381, pQ: 0.0308, pS: 0.0089, pF: 0.004, pC: 0.0013 },
  BEL: { pG: 0.9711, pR: 0.5752, pQ: 0.2935, pS: 0.171, pF: 0.0878, pC: 0.0404 },
  BIH: { pG: 0.2709, pR: 0.106, pQ: 0.0275, pS: 0.0049, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9732, pR: 0.7188, pQ: 0.4502, pS: 0.3136, pF: 0.1444, pC: 0.0678 },
  CAN: { pG: 0.6716, pR: 0.3322, pQ: 0.139, pS: 0.0476, pF: 0.0114, pC: 0.002 },
  CIV: { pG: 0.7698, pR: 0.4646, pQ: 0.1866, pS: 0.0745, pF: 0.0123, pC: 0.0033 },
  COD: { pG: 0.208, pR: 0.0379, pQ: 0.0072, pS: 0.0007, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7465, pR: 0.3229, pQ: 0.1287, pS: 0.0387, pF: 0.0226, pC: 0.0101 },
  CPV: { pG: 0.1329, pR: 0.0551, pQ: 0.013, pS: 0.0038, pF: 0.0005, pC: 0.0 },
  CRO: { pG: 0.7629, pR: 0.4138, pQ: 0.1773, pS: 0.059, pF: 0.0365, pC: 0.0148 },
  CUW: { pG: 0.1786, pR: 0.1217, pQ: 0.0237, pS: 0.0044, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6241, pR: 0.3954, pQ: 0.1618, pS: 0.0523, pF: 0.0084, pC: 0.0018 },
  ECU: { pG: 0.8588, pR: 0.4947, pQ: 0.2236, pS: 0.0904, pF: 0.0236, pC: 0.0065 },
  EGY: { pG: 0.8288, pR: 0.4768, pQ: 0.2126, pS: 0.0967, pF: 0.0208, pC: 0.0036 },
  ENG: { pG: 0.9051, pR: 0.6318, pQ: 0.4086, pS: 0.1911, pF: 0.1447, pC: 0.0841 },
  ESP: { pG: 0.9779, pR: 0.7752, pQ: 0.5835, pS: 0.4221, pF: 0.3082, pC: 0.1874 },
  FRA: { pG: 0.9296, pR: 0.7036, pQ: 0.4338, pS: 0.2785, pF: 0.2244, pC: 0.1452 },
  GER: { pG: 0.9735, pR: 0.6261, pQ: 0.3861, pS: 0.1821, pF: 0.0865, pC: 0.0372 },
  GHA: { pG: 0.0506, pR: 0.0081, pQ: 0.0009, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1375, pR: 0.106, pQ: 0.0228, pS: 0.0034, pF: 0.0004, pC: 0.0 },
  IRN: { pG: 0.8931, pR: 0.4614, pQ: 0.2107, pS: 0.1084, pF: 0.0293, pC: 0.0093 },
  IRQ: { pG: 0.1244, pR: 0.0199, pQ: 0.002, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1101, pR: 0.0109, pQ: 0.0012, pS: 0.0002, pF: 0.0001, pC: 0.0001 },
  JPN: { pG: 0.7138, pR: 0.4016, pQ: 0.189, pS: 0.0708, pF: 0.0297, pC: 0.01 },
  KOR: { pG: 0.8081, pR: 0.5331, pQ: 0.2595, pS: 0.1081, pF: 0.025, pC: 0.0073 },
  KSA: { pG: 0.2146, pR: 0.0944, pQ: 0.0237, pS: 0.0066, pF: 0.0008, pC: 0.0001 },
  MAR: { pG: 0.9723, pR: 0.7075, pQ: 0.415, pS: 0.2775, pF: 0.1266, pC: 0.057 },
  MEX: { pG: 0.9236, pR: 0.6601, pQ: 0.4273, pS: 0.2051, pF: 0.072, pC: 0.0273 },
  NED: { pG: 0.8651, pR: 0.5947, pQ: 0.3816, pS: 0.1759, pF: 0.1004, pC: 0.0471 },
  NOR: { pG: 0.2788, pR: 0.0722, pQ: 0.0119, pS: 0.0027, pF: 0.0014, pC: 0.0002 },
  NZL: { pG: 0.1546, pR: 0.1106, pQ: 0.0194, pS: 0.0031, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2814, pR: 0.0852, pQ: 0.0204, pS: 0.0034, pF: 0.0015, pC: 0.0002 },
  PAR: { pG: 0.373, pR: 0.1362, pQ: 0.0461, pS: 0.0164, pF: 0.0026, pC: 0.0001 },
  POR: { pG: 0.858, pR: 0.4667, pQ: 0.2515, pS: 0.1028, pF: 0.071, pC: 0.0376 },
  QAT: { pG: 0.4314, pR: 0.1834, pQ: 0.062, pS: 0.0147, pF: 0.0025, pC: 0.0003 },
  RSA: { pG: 0.4262, pR: 0.2762, pQ: 0.0909, pS: 0.0249, pF: 0.0013, pC: 0.0 },
  SCO: { pG: 0.6293, pR: 0.4821, pQ: 0.2056, pS: 0.0771, pF: 0.01, pC: 0.0023 },
  SEN: { pG: 0.6672, pR: 0.2802, pQ: 0.0843, pS: 0.0345, pF: 0.0209, pC: 0.0081 },
  SUI: { pG: 0.8441, pR: 0.5136, pQ: 0.3013, pS: 0.1319, pF: 0.0443, pC: 0.0148 },
  SWE: { pG: 0.3555, pR: 0.1671, pQ: 0.0555, pS: 0.0166, pF: 0.0024, pC: 0.0003 },
  TUN: { pG: 0.2849, pR: 0.1295, pQ: 0.0411, pS: 0.0135, pF: 0.0015, pC: 0.0001 },
  TUR: { pG: 0.6041, pR: 0.2573, pQ: 0.1114, pS: 0.0545, pF: 0.015, pC: 0.0045 },
  URU: { pG: 0.827, pR: 0.4513, pQ: 0.1564, pS: 0.0781, pF: 0.0361, pC: 0.0129 },
  USA: { pG: 0.7567, pR: 0.3616, pQ: 0.1839, pS: 0.1062, pF: 0.0362, pC: 0.0114 },
  UZB: { pG: 0.1875, pR: 0.0336, pQ: 0.0054, pS: 0.0004, pF: 0.0002, pC: 0.0001 },
};
