// Auto-generated from M2 batch batch_20260611_234120Z on 2026-06-11T23:41:20Z.
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
  ALG: { pG: 0.4283, pR: 0.1017, pQ: 0.0166, pS: 0.0046, pF: 0.0016, pC: 0.0002 },
  ARG: { pG: 0.9534, pR: 0.6726, pQ: 0.4125, pS: 0.2659, pF: 0.216, pC: 0.1369 },
  AUS: { pG: 0.5556, pR: 0.2278, pQ: 0.0933, pS: 0.0451, pF: 0.009, pC: 0.0026 },
  AUT: { pG: 0.5034, pR: 0.1317, pQ: 0.0281, pS: 0.0068, pF: 0.0035, pC: 0.0008 },
  BEL: { pG: 0.9737, pR: 0.5683, pQ: 0.2879, pS: 0.1712, pF: 0.0872, pC: 0.0383 },
  BIH: { pG: 0.2774, pR: 0.1105, pQ: 0.0283, pS: 0.0052, pF: 0.0004, pC: 0.0001 },
  BRA: { pG: 0.979, pR: 0.7155, pQ: 0.4361, pS: 0.3004, pF: 0.1397, pC: 0.0667 },
  CAN: { pG: 0.6842, pR: 0.3427, pQ: 0.1437, pS: 0.0469, pF: 0.0102, pC: 0.0018 },
  CIV: { pG: 0.7731, pR: 0.4702, pQ: 0.1937, pS: 0.0725, pF: 0.0122, pC: 0.0021 },
  COD: { pG: 0.2097, pR: 0.0383, pQ: 0.0073, pS: 0.0007, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7441, pR: 0.3352, pQ: 0.1425, pS: 0.0435, pF: 0.0275, pC: 0.0122 },
  CPV: { pG: 0.1359, pR: 0.0596, pQ: 0.0121, pS: 0.0034, pF: 0.0004, pC: 0.0 },
  CRO: { pG: 0.7593, pR: 0.399, pQ: 0.1634, pS: 0.0546, pF: 0.034, pC: 0.0143 },
  CUW: { pG: 0.1736, pR: 0.1146, pQ: 0.0242, pS: 0.0046, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6201, pR: 0.4027, pQ: 0.1642, pS: 0.056, pF: 0.0084, pC: 0.0015 },
  ECU: { pG: 0.8674, pR: 0.5001, pQ: 0.2323, pS: 0.0945, pF: 0.0238, pC: 0.0069 },
  EGY: { pG: 0.832, pR: 0.4852, pQ: 0.2119, pS: 0.1011, pF: 0.0199, pC: 0.0053 },
  ENG: { pG: 0.9069, pR: 0.6293, pQ: 0.4126, pS: 0.1963, pF: 0.1482, pC: 0.0829 },
  ESP: { pG: 0.9794, pR: 0.773, pQ: 0.5828, pS: 0.4271, pF: 0.3132, pC: 0.1913 },
  FRA: { pG: 0.9331, pR: 0.7026, pQ: 0.437, pS: 0.283, pF: 0.228, pC: 0.1473 },
  GER: { pG: 0.973, pR: 0.6307, pQ: 0.3839, pS: 0.1786, pF: 0.0906, pC: 0.0392 },
  GHA: { pG: 0.0492, pR: 0.0063, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1275, pR: 0.0991, pQ: 0.0224, pS: 0.0029, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8936, pR: 0.476, pQ: 0.2222, pS: 0.1135, pF: 0.028, pC: 0.01 },
  IRQ: { pG: 0.1145, pR: 0.0187, pQ: 0.0023, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1149, pR: 0.0105, pQ: 0.001, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7124, pR: 0.3973, pQ: 0.1828, pS: 0.0675, pF: 0.0289, pC: 0.0094 },
  KOR: { pG: 0.8055, pR: 0.5216, pQ: 0.252, pS: 0.099, pF: 0.0232, pC: 0.0055 },
  KSA: { pG: 0.2132, pR: 0.0947, pQ: 0.0244, pS: 0.0066, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9724, pR: 0.6971, pQ: 0.4242, pS: 0.2899, pF: 0.1367, pC: 0.0635 },
  MEX: { pG: 0.9188, pR: 0.6465, pQ: 0.4154, pS: 0.1972, pF: 0.0719, pC: 0.0265 },
  NED: { pG: 0.8709, pR: 0.5984, pQ: 0.3799, pS: 0.1759, pF: 0.0995, pC: 0.0445 },
  NOR: { pG: 0.2835, pR: 0.0719, pQ: 0.0134, pS: 0.0029, pF: 0.0015, pC: 0.0001 },
  NZL: { pG: 0.1491, pR: 0.1065, pQ: 0.021, pS: 0.0032, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2846, pR: 0.09, pQ: 0.0187, pS: 0.0025, pF: 0.0007, pC: 0.0 },
  PAR: { pG: 0.3808, pR: 0.1479, pQ: 0.0531, pS: 0.0209, pF: 0.0032, pC: 0.0005 },
  POR: { pG: 0.8655, pR: 0.4687, pQ: 0.2504, pS: 0.1032, pF: 0.0704, pC: 0.0365 },
  QAT: { pG: 0.4095, pR: 0.1821, pQ: 0.0591, pS: 0.0155, pF: 0.0015, pC: 0.0001 },
  RSA: { pG: 0.4366, pR: 0.2838, pQ: 0.0909, pS: 0.027, pF: 0.0024, pC: 0.0007 },
  SCO: { pG: 0.6244, pR: 0.4855, pQ: 0.2118, pS: 0.0829, pF: 0.0129, pC: 0.0022 },
  SEN: { pG: 0.6689, pR: 0.2903, pQ: 0.0891, pS: 0.0352, pF: 0.02, pC: 0.007 },
  SUI: { pG: 0.8479, pR: 0.5101, pQ: 0.3029, pS: 0.1242, pF: 0.0391, pC: 0.0132 },
  SWE: { pG: 0.3494, pR: 0.1589, pQ: 0.054, pS: 0.0166, pF: 0.0023, pC: 0.0004 },
  TUN: { pG: 0.2802, pR: 0.1298, pQ: 0.0387, pS: 0.0116, pF: 0.0014, pC: 0.0002 },
  TUR: { pG: 0.5961, pR: 0.2561, pQ: 0.1106, pS: 0.0583, pF: 0.015, pC: 0.004 },
  URU: { pG: 0.8231, pR: 0.4367, pQ: 0.1482, pS: 0.0708, pF: 0.0285, pC: 0.011 },
  USA: { pG: 0.7642, pR: 0.371, pQ: 0.192, pS: 0.1099, pF: 0.0379, pC: 0.0141 },
  UZB: { pG: 0.1807, pR: 0.0332, pQ: 0.0046, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
