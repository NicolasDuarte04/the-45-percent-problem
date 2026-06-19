// Auto-generated from M2 batch batch_20260619_210723Z on 2026-06-19T21:07:23Z.
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
  ALG: { pG: 0.4156, pR: 0.103, pQ: 0.0157, pS: 0.0038, pF: 0.0016, pC: 0.0004 },
  ARG: { pG: 0.9506, pR: 0.6722, pQ: 0.4188, pS: 0.272, pF: 0.2181, pC: 0.1389 },
  AUS: { pG: 0.56, pR: 0.2323, pQ: 0.0992, pS: 0.0488, pF: 0.0116, pC: 0.0025 },
  AUT: { pG: 0.5225, pR: 0.1383, pQ: 0.0274, pS: 0.0079, pF: 0.0037, pC: 0.0012 },
  BEL: { pG: 0.975, pR: 0.5704, pQ: 0.2788, pS: 0.1649, pF: 0.0789, pC: 0.0338 },
  BIH: { pG: 0.2552, pR: 0.1021, pQ: 0.0269, pS: 0.0048, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9747, pR: 0.7148, pQ: 0.4388, pS: 0.3025, pF: 0.1414, pC: 0.0683 },
  CAN: { pG: 0.6772, pR: 0.3349, pQ: 0.1414, pS: 0.0475, pF: 0.0108, pC: 0.0022 },
  CIV: { pG: 0.7754, pR: 0.4691, pQ: 0.1923, pS: 0.0736, pF: 0.0132, pC: 0.0031 },
  COD: { pG: 0.213, pR: 0.0396, pQ: 0.0068, pS: 0.0007, pF: 0.0, pC: 0.0 },
  COL: { pG: 0.7503, pR: 0.3331, pQ: 0.1341, pS: 0.0445, pF: 0.0267, pC: 0.0103 },
  CPV: { pG: 0.1399, pR: 0.06, pQ: 0.0145, pS: 0.0044, pF: 0.0004, pC: 0.0001 },
  CRO: { pG: 0.7643, pR: 0.4024, pQ: 0.1682, pS: 0.0571, pF: 0.0381, pC: 0.0172 },
  CUW: { pG: 0.1728, pR: 0.1177, pQ: 0.0229, pS: 0.0051, pF: 0.0002, pC: 0.0001 },
  CZE: { pG: 0.6247, pR: 0.4088, pQ: 0.1613, pS: 0.0545, pF: 0.0076, pC: 0.0014 },
  ECU: { pG: 0.8636, pR: 0.4977, pQ: 0.2222, pS: 0.0947, pF: 0.0231, pC: 0.0074 },
  EGY: { pG: 0.8223, pR: 0.4779, pQ: 0.2149, pS: 0.0967, pF: 0.0189, pC: 0.0042 },
  ENG: { pG: 0.9112, pR: 0.6254, pQ: 0.4097, pS: 0.1935, pF: 0.1456, pC: 0.0849 },
  ESP: { pG: 0.9762, pR: 0.7696, pQ: 0.5833, pS: 0.4224, pF: 0.3067, pC: 0.1867 },
  FRA: { pG: 0.935, pR: 0.7034, pQ: 0.4385, pS: 0.2802, pF: 0.2264, pC: 0.1466 },
  GER: { pG: 0.9705, pR: 0.6256, pQ: 0.3795, pS: 0.1817, pF: 0.0927, pC: 0.041 },
  GHA: { pG: 0.0476, pR: 0.0046, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1346, pR: 0.1077, pQ: 0.0228, pS: 0.0038, pF: 0.0002, pC: 0.0001 },
  IRN: { pG: 0.8956, pR: 0.4783, pQ: 0.2141, pS: 0.1075, pF: 0.0307, pC: 0.0097 },
  IRQ: { pG: 0.1182, pR: 0.0174, pQ: 0.0019, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1113, pR: 0.0113, pQ: 0.0007, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.711, pR: 0.4081, pQ: 0.1895, pS: 0.0714, pF: 0.03, pC: 0.0092 },
  KOR: { pG: 0.8096, pR: 0.5321, pQ: 0.2656, pS: 0.106, pF: 0.0274, pC: 0.0079 },
  KSA: { pG: 0.2154, pR: 0.1, pQ: 0.0271, pS: 0.0088, pF: 0.001, pC: 0.0002 },
  MAR: { pG: 0.9691, pR: 0.7055, pQ: 0.426, pS: 0.2909, pF: 0.1351, pC: 0.0612 },
  MEX: { pG: 0.9222, pR: 0.6537, pQ: 0.4215, pS: 0.1985, pF: 0.0716, pC: 0.0271 },
  NED: { pG: 0.8699, pR: 0.5947, pQ: 0.3864, pS: 0.178, pF: 0.1002, pC: 0.0461 },
  NOR: { pG: 0.2892, pR: 0.0731, pQ: 0.0125, pS: 0.0028, pF: 0.0013, pC: 0.0005 },
  NZL: { pG: 0.1462, pR: 0.1003, pQ: 0.0221, pS: 0.0031, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2769, pR: 0.0883, pQ: 0.0194, pS: 0.0032, pF: 0.001, pC: 0.0001 },
  PAR: { pG: 0.3693, pR: 0.1442, pQ: 0.0532, pS: 0.0201, pF: 0.004, pC: 0.0005 },
  POR: { pG: 0.8596, pR: 0.4756, pQ: 0.256, pS: 0.0994, pF: 0.0682, pC: 0.033 },
  QAT: { pG: 0.4365, pR: 0.1817, pQ: 0.0574, pS: 0.0148, pF: 0.0018, pC: 0.0004 },
  RSA: { pG: 0.4267, pR: 0.2774, pQ: 0.0899, pS: 0.0225, pF: 0.002, pC: 0.0005 },
  SCO: { pG: 0.6314, pR: 0.4788, pQ: 0.2075, pS: 0.082, pF: 0.0106, pC: 0.002 },
  SEN: { pG: 0.6576, pR: 0.2813, pQ: 0.0845, pS: 0.0337, pF: 0.0216, pC: 0.0077 },
  SUI: { pG: 0.8479, pR: 0.5093, pQ: 0.2961, pS: 0.1262, pF: 0.0437, pC: 0.015 },
  SWE: { pG: 0.3507, pR: 0.1627, pQ: 0.0568, pS: 0.0181, pF: 0.0036, pC: 0.0008 },
  TUN: { pG: 0.2861, pR: 0.1244, pQ: 0.0397, pS: 0.0101, pF: 0.0014, pC: 0.0002 },
  TUR: { pG: 0.5967, pR: 0.2556, pQ: 0.1071, pS: 0.0545, pF: 0.0119, pC: 0.0033 },
  URU: { pG: 0.8294, pR: 0.4435, pQ: 0.1559, pS: 0.0749, pF: 0.0316, pC: 0.0107 },
  USA: { pG: 0.7642, pR: 0.3611, pQ: 0.1853, pS: 0.1072, pF: 0.0348, pC: 0.0135 },
  UZB: { pG: 0.1771, pR: 0.031, pQ: 0.0054, pS: 0.0007, pF: 0.0001, pC: 0.0 },
};
