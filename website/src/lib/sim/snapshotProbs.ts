// Auto-generated from M2 batch batch_20260612_161527Z on 2026-06-12T16:15:27Z.
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
  ALG: { pG: 0.426, pR: 0.1049, pQ: 0.0199, pS: 0.0042, pF: 0.0015, pC: 0.0005 },
  ARG: { pG: 0.9504, pR: 0.6772, pQ: 0.4231, pS: 0.2734, pF: 0.222, pC: 0.1427 },
  AUS: { pG: 0.5649, pR: 0.2333, pQ: 0.1007, pS: 0.0458, pF: 0.0118, pC: 0.0029 },
  AUT: { pG: 0.515, pR: 0.1381, pQ: 0.0291, pS: 0.0077, pF: 0.0041, pC: 0.0009 },
  BEL: { pG: 0.9719, pR: 0.5639, pQ: 0.2853, pS: 0.1708, pF: 0.0833, pC: 0.0336 },
  BIH: { pG: 0.2713, pR: 0.1125, pQ: 0.0305, pS: 0.0068, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9707, pR: 0.712, pQ: 0.4267, pS: 0.2935, pF: 0.1396, pC: 0.0658 },
  CAN: { pG: 0.6751, pR: 0.3314, pQ: 0.1416, pS: 0.0462, pF: 0.0095, pC: 0.0022 },
  CIV: { pG: 0.7702, pR: 0.4691, pQ: 0.1903, pS: 0.0749, pF: 0.0135, pC: 0.0026 },
  COD: { pG: 0.2101, pR: 0.0404, pQ: 0.007, pS: 0.0005, pF: 0.0, pC: 0.0 },
  COL: { pG: 0.7348, pR: 0.3287, pQ: 0.1314, pS: 0.0416, pF: 0.0251, pC: 0.0101 },
  CPV: { pG: 0.1383, pR: 0.0602, pQ: 0.014, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7635, pR: 0.4114, pQ: 0.1722, pS: 0.0589, pF: 0.0363, pC: 0.0159 },
  CUW: { pG: 0.1755, pR: 0.1194, pQ: 0.0227, pS: 0.0039, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6255, pR: 0.4069, pQ: 0.1597, pS: 0.0519, pF: 0.0079, pC: 0.0017 },
  ECU: { pG: 0.8719, pR: 0.5006, pQ: 0.2264, pS: 0.0954, pF: 0.0249, pC: 0.0063 },
  EGY: { pG: 0.8346, pR: 0.4798, pQ: 0.2122, pS: 0.1038, pF: 0.0193, pC: 0.0052 },
  ENG: { pG: 0.9076, pR: 0.6278, pQ: 0.4143, pS: 0.1966, pF: 0.1501, pC: 0.0888 },
  ESP: { pG: 0.9741, pR: 0.7786, pQ: 0.5948, pS: 0.4345, pF: 0.3158, pC: 0.1917 },
  FRA: { pG: 0.9339, pR: 0.6995, pQ: 0.4299, pS: 0.2761, pF: 0.2249, pC: 0.1438 },
  GER: { pG: 0.9711, pR: 0.6273, pQ: 0.3837, pS: 0.1743, pF: 0.0864, pC: 0.0371 },
  GHA: { pG: 0.0473, pR: 0.0069, pQ: 0.0009, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1321, pR: 0.1063, pQ: 0.0233, pS: 0.0042, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.893, pR: 0.4677, pQ: 0.2094, pS: 0.105, pF: 0.0299, pC: 0.0088 },
  IRQ: { pG: 0.1234, pR: 0.0182, pQ: 0.0022, pS: 0.0003, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.1086, pR: 0.0102, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7082, pR: 0.4032, pQ: 0.1867, pS: 0.0669, pF: 0.0275, pC: 0.0099 },
  KOR: { pG: 0.8074, pR: 0.53, pQ: 0.2559, pS: 0.1068, pF: 0.024, pC: 0.0065 },
  KSA: { pG: 0.2148, pR: 0.0951, pQ: 0.0247, pS: 0.0074, pF: 0.0007, pC: 0.0002 },
  MAR: { pG: 0.973, pR: 0.7034, pQ: 0.4366, pS: 0.2936, pF: 0.1343, pC: 0.0636 },
  MEX: { pG: 0.9208, pR: 0.658, pQ: 0.4223, pS: 0.2045, pF: 0.0727, pC: 0.0274 },
  NED: { pG: 0.8662, pR: 0.5938, pQ: 0.3832, pS: 0.1754, pF: 0.0972, pC: 0.0449 },
  NOR: { pG: 0.2759, pR: 0.0698, pQ: 0.0127, pS: 0.0037, pF: 0.0014, pC: 0.0002 },
  NZL: { pG: 0.152, pR: 0.1064, pQ: 0.0221, pS: 0.0042, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2816, pR: 0.0878, pQ: 0.0157, pS: 0.0023, pF: 0.0012, pC: 0.0002 },
  PAR: { pG: 0.3698, pR: 0.1402, pQ: 0.0523, pS: 0.0186, pF: 0.0025, pC: 0.0004 },
  POR: { pG: 0.864, pR: 0.4651, pQ: 0.2524, pS: 0.1004, pF: 0.0685, pC: 0.0334 },
  QAT: { pG: 0.4254, pR: 0.1777, pQ: 0.0565, pS: 0.0139, pF: 0.0014, pC: 0.0001 },
  RSA: { pG: 0.4285, pR: 0.2785, pQ: 0.09, pS: 0.0255, pF: 0.003, pC: 0.0001 },
  SCO: { pG: 0.6304, pR: 0.4874, pQ: 0.2104, pS: 0.0804, pF: 0.01, pC: 0.0016 },
  SEN: { pG: 0.6668, pR: 0.2821, pQ: 0.0825, pS: 0.0338, pF: 0.0191, pC: 0.0088 },
  SUI: { pG: 0.846, pR: 0.505, pQ: 0.2961, pS: 0.1249, pF: 0.0418, pC: 0.0125 },
  SWE: { pG: 0.3518, pR: 0.1612, pQ: 0.0577, pS: 0.0151, pF: 0.0032, pC: 0.0007 },
  TUN: { pG: 0.2851, pR: 0.1254, pQ: 0.04, pS: 0.0112, pF: 0.0017, pC: 0.0001 },
  TUR: { pG: 0.599, pR: 0.2552, pQ: 0.1154, pS: 0.0589, pF: 0.0141, pC: 0.0042 },
  URU: { pG: 0.8213, pR: 0.4483, pQ: 0.1468, pS: 0.0734, pF: 0.0311, pC: 0.0111 },
  USA: { pG: 0.7601, pR: 0.3622, pQ: 0.182, pS: 0.1052, pF: 0.0377, pC: 0.0135 },
  UZB: { pG: 0.1911, pR: 0.0319, pQ: 0.0061, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
