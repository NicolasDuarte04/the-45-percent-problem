// Auto-generated from M2 batch batch_20260612_190300Z on 2026-06-12T19:03:00Z.
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
  ALG: { pG: 0.4271, pR: 0.0993, pQ: 0.019, pS: 0.0045, pF: 0.0025, pC: 0.0009 },
  ARG: { pG: 0.9536, pR: 0.6802, pQ: 0.4198, pS: 0.2676, pF: 0.2145, pC: 0.1382 },
  AUS: { pG: 0.5637, pR: 0.2336, pQ: 0.0986, pS: 0.0468, pF: 0.01, pC: 0.0022 },
  AUT: { pG: 0.5069, pR: 0.1376, pQ: 0.0282, pS: 0.008, pF: 0.0033, pC: 0.001 },
  BEL: { pG: 0.9722, pR: 0.5629, pQ: 0.2778, pS: 0.1689, pF: 0.0865, pC: 0.0378 },
  BIH: { pG: 0.2641, pR: 0.1022, pQ: 0.0283, pS: 0.0059, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9736, pR: 0.7168, pQ: 0.438, pS: 0.3002, pF: 0.1393, pC: 0.064 },
  CAN: { pG: 0.6889, pR: 0.3402, pQ: 0.1482, pS: 0.0486, pF: 0.01, pC: 0.0027 },
  CIV: { pG: 0.7708, pR: 0.4707, pQ: 0.1956, pS: 0.078, pF: 0.0133, pC: 0.0026 },
  COD: { pG: 0.2063, pR: 0.04, pQ: 0.0069, pS: 0.0007, pF: 0.0005, pC: 0.0 },
  COL: { pG: 0.7436, pR: 0.3317, pQ: 0.1426, pS: 0.0455, pF: 0.0251, pC: 0.0103 },
  CPV: { pG: 0.1333, pR: 0.0561, pQ: 0.0118, pS: 0.0021, pF: 0.0002, pC: 0.0001 },
  CRO: { pG: 0.7646, pR: 0.4126, pQ: 0.1681, pS: 0.0573, pF: 0.0369, pC: 0.0164 },
  CUW: { pG: 0.1733, pR: 0.1164, pQ: 0.0209, pS: 0.0041, pF: 0.0002, pC: 0.0001 },
  CZE: { pG: 0.633, pR: 0.4052, pQ: 0.1593, pS: 0.0558, pF: 0.0081, pC: 0.0015 },
  ECU: { pG: 0.8667, pR: 0.5018, pQ: 0.2264, pS: 0.0931, pF: 0.0248, pC: 0.0066 },
  EGY: { pG: 0.8274, pR: 0.4747, pQ: 0.216, pS: 0.0963, pF: 0.0203, pC: 0.0045 },
  ENG: { pG: 0.9086, pR: 0.622, pQ: 0.4029, pS: 0.188, pF: 0.141, pC: 0.0811 },
  ESP: { pG: 0.9801, pR: 0.7812, pQ: 0.5952, pS: 0.4283, pF: 0.3123, pC: 0.191 },
  FRA: { pG: 0.9336, pR: 0.7021, pQ: 0.4389, pS: 0.2827, pF: 0.2285, pC: 0.1487 },
  GER: { pG: 0.971, pR: 0.6282, pQ: 0.3862, pS: 0.1765, pF: 0.0888, pC: 0.0383 },
  GHA: { pG: 0.0455, pR: 0.0067, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1329, pR: 0.1044, pQ: 0.0254, pS: 0.0036, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8954, pR: 0.4789, pQ: 0.2176, pS: 0.1084, pF: 0.0281, pC: 0.0075 },
  IRQ: { pG: 0.1252, pR: 0.0204, pQ: 0.0022, pS: 0.0004, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1124, pR: 0.0117, pQ: 0.0008, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.709, pR: 0.4024, pQ: 0.1876, pS: 0.0743, pF: 0.0288, pC: 0.009 },
  KOR: { pG: 0.8057, pR: 0.527, pQ: 0.2577, pS: 0.1043, pF: 0.0255, pC: 0.0071 },
  KSA: { pG: 0.2163, pR: 0.1, pQ: 0.0268, pS: 0.0089, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9733, pR: 0.7037, pQ: 0.4262, pS: 0.2892, pF: 0.1314, pC: 0.0613 },
  MEX: { pG: 0.9202, pR: 0.6623, pQ: 0.4236, pS: 0.206, pF: 0.0759, pC: 0.0263 },
  NED: { pG: 0.8715, pR: 0.5939, pQ: 0.3799, pS: 0.1757, pF: 0.1005, pC: 0.047 },
  NOR: { pG: 0.2778, pR: 0.0695, pQ: 0.0109, pS: 0.0018, pF: 0.0006, pC: 0.0003 },
  NZL: { pG: 0.1519, pR: 0.1066, pQ: 0.0224, pS: 0.004, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2813, pR: 0.0833, pQ: 0.0173, pS: 0.0024, pF: 0.001, pC: 0.0003 },
  PAR: { pG: 0.362, pR: 0.1406, pQ: 0.0506, pS: 0.0195, pF: 0.0032, pC: 0.0002 },
  POR: { pG: 0.8619, pR: 0.4719, pQ: 0.2562, pS: 0.1072, pF: 0.076, pC: 0.0392 },
  QAT: { pG: 0.4182, pR: 0.1825, pQ: 0.0607, pS: 0.0152, pF: 0.0012, pC: 0.0 },
  RSA: { pG: 0.4241, pR: 0.2734, pQ: 0.085, pS: 0.0229, pF: 0.0023, pC: 0.0002 },
  SCO: { pG: 0.6289, pR: 0.474, pQ: 0.2057, pS: 0.077, pF: 0.0104, pC: 0.0016 },
  SEN: { pG: 0.6634, pR: 0.2792, pQ: 0.0802, pS: 0.0331, pF: 0.0199, pC: 0.0079 },
  SUI: { pG: 0.8458, pR: 0.5072, pQ: 0.2959, pS: 0.1245, pF: 0.0395, pC: 0.0129 },
  SWE: { pG: 0.3521, pR: 0.1607, pQ: 0.0531, pS: 0.0174, pF: 0.0027, pC: 0.0007 },
  TUN: { pG: 0.2856, pR: 0.1259, pQ: 0.0401, pS: 0.0128, pF: 0.0019, pC: 0.0003 },
  TUR: { pG: 0.6008, pR: 0.2509, pQ: 0.1095, pS: 0.0539, pF: 0.0151, pC: 0.0031 },
  URU: { pG: 0.8234, pR: 0.4396, pQ: 0.1426, pS: 0.0694, pF: 0.0304, pC: 0.0118 },
  USA: { pG: 0.7648, pR: 0.376, pQ: 0.1873, pS: 0.1084, pF: 0.0382, pC: 0.0152 },
  UZB: { pG: 0.1882, pR: 0.0318, pQ: 0.0057, pS: 0.0007, pF: 0.0003, pC: 0.0 },
};
