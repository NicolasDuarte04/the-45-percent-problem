// Auto-generated from M2 batch batch_20260620_084939Z on 2026-06-20T08:49:39Z.
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
  ALG: { pG: 0.4318, pR: 0.1087, pQ: 0.0186, pS: 0.0045, pF: 0.002, pC: 0.0008 },
  ARG: { pG: 0.9495, pR: 0.6723, pQ: 0.4124, pS: 0.2688, pF: 0.2155, pC: 0.1377 },
  AUS: { pG: 0.5528, pR: 0.2256, pQ: 0.0915, pS: 0.0422, pF: 0.0092, pC: 0.0019 },
  AUT: { pG: 0.5049, pR: 0.1335, pQ: 0.0273, pS: 0.009, pF: 0.005, pC: 0.0016 },
  BEL: { pG: 0.9715, pR: 0.5634, pQ: 0.2828, pS: 0.1662, pF: 0.0808, pC: 0.0351 },
  BIH: { pG: 0.2727, pR: 0.1033, pQ: 0.0252, pS: 0.0058, pF: 0.0006, pC: 0.0003 },
  BRA: { pG: 0.9731, pR: 0.7177, pQ: 0.4475, pS: 0.3086, pF: 0.1361, pC: 0.0661 },
  CAN: { pG: 0.6707, pR: 0.329, pQ: 0.1377, pS: 0.042, pF: 0.0099, pC: 0.0022 },
  CIV: { pG: 0.7643, pR: 0.4648, pQ: 0.1895, pS: 0.0716, pF: 0.0115, pC: 0.0026 },
  COD: { pG: 0.2071, pR: 0.0406, pQ: 0.009, pS: 0.0009, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7516, pR: 0.3218, pQ: 0.1343, pS: 0.0406, pF: 0.0256, pC: 0.0099 },
  CPV: { pG: 0.1339, pR: 0.0577, pQ: 0.0131, pS: 0.0044, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7659, pR: 0.411, pQ: 0.1682, pS: 0.0551, pF: 0.0354, pC: 0.0147 },
  CUW: { pG: 0.1747, pR: 0.1162, pQ: 0.0222, pS: 0.004, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6256, pR: 0.4118, pQ: 0.1616, pS: 0.0533, pF: 0.0076, pC: 0.0009 },
  ECU: { pG: 0.8699, pR: 0.4924, pQ: 0.2153, pS: 0.0875, pF: 0.0223, pC: 0.0066 },
  EGY: { pG: 0.8336, pR: 0.4875, pQ: 0.2164, pS: 0.0993, pF: 0.0209, pC: 0.0056 },
  ENG: { pG: 0.9072, pR: 0.6351, pQ: 0.4169, pS: 0.1969, pF: 0.1517, pC: 0.083 },
  ESP: { pG: 0.9794, pR: 0.7728, pQ: 0.5911, pS: 0.4231, pF: 0.3117, pC: 0.1882 },
  FRA: { pG: 0.935, pR: 0.6996, pQ: 0.4437, pS: 0.285, pF: 0.2329, pC: 0.1483 },
  GER: { pG: 0.9672, pR: 0.6328, pQ: 0.3919, pS: 0.1823, pF: 0.0897, pC: 0.0406 },
  GHA: { pG: 0.0467, pR: 0.0049, pQ: 0.0004, pS: 0.0002, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1302, pR: 0.1007, pQ: 0.0244, pS: 0.0036, pF: 0.0003, pC: 0.0 },
  IRN: { pG: 0.8966, pR: 0.4815, pQ: 0.221, pS: 0.1143, pF: 0.0303, pC: 0.0103 },
  IRQ: { pG: 0.1211, pR: 0.0192, pQ: 0.0019, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1138, pR: 0.0115, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7178, pR: 0.4078, pQ: 0.1937, pS: 0.0753, pF: 0.0307, pC: 0.0101 },
  KOR: { pG: 0.8118, pR: 0.5257, pQ: 0.2567, pS: 0.1065, pF: 0.0268, pC: 0.0066 },
  KSA: { pG: 0.2183, pR: 0.0939, pQ: 0.0261, pS: 0.0085, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9699, pR: 0.7047, pQ: 0.4223, pS: 0.2917, pF: 0.1275, pC: 0.0599 },
  MEX: { pG: 0.9172, pR: 0.6542, pQ: 0.4242, pS: 0.1989, pF: 0.0729, pC: 0.0272 },
  NED: { pG: 0.8659, pR: 0.5922, pQ: 0.3778, pS: 0.176, pF: 0.1056, pC: 0.0495 },
  NOR: { pG: 0.2778, pR: 0.0705, pQ: 0.0113, pS: 0.003, pF: 0.0015, pC: 0.0004 },
  NZL: { pG: 0.1465, pR: 0.1028, pQ: 0.0182, pS: 0.0036, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2802, pR: 0.0819, pQ: 0.0177, pS: 0.0029, pF: 0.0011, pC: 0.0003 },
  PAR: { pG: 0.3751, pR: 0.1419, pQ: 0.0528, pS: 0.0201, pF: 0.003, pC: 0.0007 },
  POR: { pG: 0.8582, pR: 0.472, pQ: 0.2474, pS: 0.098, pF: 0.0683, pC: 0.0348 },
  QAT: { pG: 0.4229, pR: 0.1808, pQ: 0.0555, pS: 0.0125, pF: 0.0008, pC: 0.0001 },
  RSA: { pG: 0.4304, pR: 0.2813, pQ: 0.0885, pS: 0.0251, pF: 0.0025, pC: 0.0005 },
  SCO: { pG: 0.6268, pR: 0.4748, pQ: 0.2004, pS: 0.0818, pF: 0.0099, pC: 0.0011 },
  SEN: { pG: 0.6661, pR: 0.2847, pQ: 0.0842, pS: 0.0345, pF: 0.0213, pC: 0.0083 },
  SUI: { pG: 0.8487, pR: 0.5139, pQ: 0.3041, pS: 0.1299, pF: 0.0428, pC: 0.015 },
  SWE: { pG: 0.3556, pR: 0.162, pQ: 0.0529, pS: 0.0153, pF: 0.0021, pC: 0.0003 },
  TUN: { pG: 0.2846, pR: 0.1318, pQ: 0.0393, pS: 0.0102, pF: 0.0011, pC: 0.0 },
  TUR: { pG: 0.6099, pR: 0.2602, pQ: 0.1184, pS: 0.0604, pF: 0.0154, pC: 0.0041 },
  URU: { pG: 0.8202, pR: 0.4404, pQ: 0.1487, pS: 0.0713, pF: 0.0306, pC: 0.0111 },
  USA: { pG: 0.7622, pR: 0.3744, pQ: 0.1892, pS: 0.1047, pF: 0.036, pC: 0.0135 },
  UZB: { pG: 0.1831, pR: 0.0327, pQ: 0.0061, pS: 0.0004, pF: 0.0002, pC: 0.0001 },
};
