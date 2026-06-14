// Auto-generated from M2 batch batch_20260614_154816Z on 2026-06-14T15:48:16Z.
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
  ALG: { pG: 0.4262, pR: 0.1028, pQ: 0.0189, pS: 0.0052, pF: 0.0025, pC: 0.0008 },
  ARG: { pG: 0.9542, pR: 0.6766, pQ: 0.4226, pS: 0.2708, pF: 0.2193, pC: 0.1378 },
  AUS: { pG: 0.5503, pR: 0.2298, pQ: 0.0984, pS: 0.0475, pF: 0.0098, pC: 0.0028 },
  AUT: { pG: 0.5114, pR: 0.1446, pQ: 0.0311, pS: 0.0082, pF: 0.0035, pC: 0.0009 },
  BEL: { pG: 0.9733, pR: 0.5661, pQ: 0.2804, pS: 0.1681, pF: 0.0825, pC: 0.0372 },
  BIH: { pG: 0.2642, pR: 0.0998, pQ: 0.0246, pS: 0.0043, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9733, pR: 0.7106, pQ: 0.437, pS: 0.3036, pF: 0.1404, pC: 0.0667 },
  CAN: { pG: 0.6876, pR: 0.3391, pQ: 0.1433, pS: 0.0504, pF: 0.0114, pC: 0.0021 },
  CIV: { pG: 0.7712, pR: 0.4706, pQ: 0.1933, pS: 0.0751, pF: 0.0149, pC: 0.0043 },
  COD: { pG: 0.2127, pR: 0.0396, pQ: 0.0063, pS: 0.0005, pF: 0.0004, pC: 0.0002 },
  COL: { pG: 0.742, pR: 0.3293, pQ: 0.1335, pS: 0.0461, pF: 0.0282, pC: 0.0117 },
  CPV: { pG: 0.1323, pR: 0.0574, pQ: 0.0133, pS: 0.0028, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7656, pR: 0.4099, pQ: 0.1741, pS: 0.0596, pF: 0.0378, pC: 0.016 },
  CUW: { pG: 0.1772, pR: 0.1219, pQ: 0.0262, pS: 0.0053, pF: 0.0005, pC: 0.0 },
  CZE: { pG: 0.6197, pR: 0.4068, pQ: 0.1608, pS: 0.0564, pF: 0.0088, pC: 0.0011 },
  ECU: { pG: 0.8649, pR: 0.5015, pQ: 0.2356, pS: 0.1005, pF: 0.0242, pC: 0.006 },
  EGY: { pG: 0.8261, pR: 0.4755, pQ: 0.2079, pS: 0.0958, pF: 0.0211, pC: 0.0045 },
  ENG: { pG: 0.9037, pR: 0.6245, pQ: 0.404, pS: 0.1937, pF: 0.1445, pC: 0.0857 },
  ESP: { pG: 0.98, pR: 0.7764, pQ: 0.5948, pS: 0.4291, pF: 0.3129, pC: 0.1907 },
  FRA: { pG: 0.9319, pR: 0.6916, pQ: 0.4316, pS: 0.2796, pF: 0.2247, pC: 0.1497 },
  GER: { pG: 0.9759, pR: 0.6215, pQ: 0.3863, pS: 0.1763, pF: 0.0906, pC: 0.0386 },
  GHA: { pG: 0.0478, pR: 0.005, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1289, pR: 0.1005, pQ: 0.0194, pS: 0.0031, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8923, pR: 0.4741, pQ: 0.218, pS: 0.1081, pF: 0.0289, pC: 0.0088 },
  IRQ: { pG: 0.1227, pR: 0.0198, pQ: 0.0028, pS: 0.0004, pF: 0.0003, pC: 0.0 },
  JOR: { pG: 0.1082, pR: 0.0102, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7088, pR: 0.3998, pQ: 0.1871, pS: 0.0722, pF: 0.0309, pC: 0.0109 },
  KOR: { pG: 0.8051, pR: 0.5252, pQ: 0.259, pS: 0.1059, pF: 0.0272, pC: 0.0081 },
  KSA: { pG: 0.2116, pR: 0.0976, pQ: 0.0242, pS: 0.0062, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9737, pR: 0.7044, pQ: 0.4266, pS: 0.2863, pF: 0.1275, pC: 0.0568 },
  MEX: { pG: 0.924, pR: 0.6588, pQ: 0.4301, pS: 0.2043, pF: 0.0723, pC: 0.0289 },
  NED: { pG: 0.8689, pR: 0.5985, pQ: 0.3817, pS: 0.1769, pF: 0.1023, pC: 0.0466 },
  NOR: { pG: 0.2737, pR: 0.0689, pQ: 0.0106, pS: 0.0022, pF: 0.0008, pC: 0.0 },
  NZL: { pG: 0.1544, pR: 0.1103, pQ: 0.0186, pS: 0.003, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2829, pR: 0.0877, pQ: 0.0192, pS: 0.0023, pF: 0.0013, pC: 0.0004 },
  PAR: { pG: 0.3649, pR: 0.1413, pQ: 0.0523, pS: 0.0205, pF: 0.0028, pC: 0.0006 },
  POR: { pG: 0.8563, pR: 0.4739, pQ: 0.256, pS: 0.0989, pF: 0.0667, pC: 0.032 },
  QAT: { pG: 0.4165, pR: 0.1791, pQ: 0.058, pS: 0.0143, pF: 0.0013, pC: 0.0001 },
  RSA: { pG: 0.4398, pR: 0.2825, pQ: 0.0931, pS: 0.0257, pF: 0.0025, pC: 0.0001 },
  SCO: { pG: 0.6356, pR: 0.4847, pQ: 0.201, pS: 0.0801, pF: 0.0109, pC: 0.0014 },
  SEN: { pG: 0.6717, pR: 0.2855, pQ: 0.0817, pS: 0.0319, pF: 0.0197, pC: 0.0077 },
  SUI: { pG: 0.8431, pR: 0.5087, pQ: 0.3002, pS: 0.1278, pF: 0.0385, pC: 0.0147 },
  SWE: { pG: 0.3519, pR: 0.1622, pQ: 0.0532, pS: 0.0142, pF: 0.0024, pC: 0.0004 },
  TUN: { pG: 0.2812, pR: 0.124, pQ: 0.0361, pS: 0.0105, pF: 0.0016, pC: 0.0003 },
  TUR: { pG: 0.608, pR: 0.2586, pQ: 0.1119, pS: 0.0538, pF: 0.0152, pC: 0.0035 },
  URU: { pG: 0.83, pR: 0.4426, pQ: 0.1433, pS: 0.0677, pF: 0.0305, pC: 0.0087 },
  USA: { pG: 0.7653, pR: 0.3701, pQ: 0.1843, pS: 0.1042, pF: 0.0372, pC: 0.0131 },
  UZB: { pG: 0.189, pR: 0.0301, pQ: 0.0064, pS: 0.0006, pF: 0.0003, pC: 0.0001 },
};
