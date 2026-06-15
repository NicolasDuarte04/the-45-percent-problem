// Auto-generated from M2 batch batch_20260615_034536Z on 2026-06-15T03:45:36Z.
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
  ALG: { pG: 0.4295, pR: 0.1026, pQ: 0.0167, pS: 0.0041, pF: 0.0019, pC: 0.0006 },
  ARG: { pG: 0.9507, pR: 0.6776, pQ: 0.4234, pS: 0.2717, pF: 0.2215, pC: 0.1421 },
  AUS: { pG: 0.5597, pR: 0.2323, pQ: 0.095, pS: 0.0447, pF: 0.0116, pC: 0.0036 },
  AUT: { pG: 0.514, pR: 0.1446, pQ: 0.027, pS: 0.0074, pF: 0.0035, pC: 0.001 },
  BEL: { pG: 0.9728, pR: 0.5709, pQ: 0.2872, pS: 0.1721, pF: 0.0848, pC: 0.0364 },
  BIH: { pG: 0.2656, pR: 0.1064, pQ: 0.0292, pS: 0.0074, pF: 0.0002, pC: 0.0002 },
  BRA: { pG: 0.9737, pR: 0.7124, pQ: 0.4456, pS: 0.3022, pF: 0.1419, pC: 0.0688 },
  CAN: { pG: 0.6806, pR: 0.3403, pQ: 0.1406, pS: 0.0452, pF: 0.0102, pC: 0.003 },
  CIV: { pG: 0.7738, pR: 0.4707, pQ: 0.1896, pS: 0.0783, pF: 0.0148, pC: 0.0025 },
  COD: { pG: 0.2099, pR: 0.0379, pQ: 0.0068, pS: 0.0007, pF: 0.0004, pC: 0.0 },
  COL: { pG: 0.7523, pR: 0.3365, pQ: 0.1353, pS: 0.0426, pF: 0.025, pC: 0.0085 },
  CPV: { pG: 0.1319, pR: 0.0562, pQ: 0.0135, pS: 0.0028, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7602, pR: 0.4034, pQ: 0.1667, pS: 0.0547, pF: 0.0349, pC: 0.0154 },
  CUW: { pG: 0.177, pR: 0.121, pQ: 0.0233, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6196, pR: 0.4026, pQ: 0.1645, pS: 0.0549, pF: 0.0085, pC: 0.0023 },
  ECU: { pG: 0.8652, pR: 0.4869, pQ: 0.2212, pS: 0.0921, pF: 0.0246, pC: 0.0069 },
  EGY: { pG: 0.8314, pR: 0.4785, pQ: 0.208, pS: 0.0961, pF: 0.021, pC: 0.0049 },
  ENG: { pG: 0.9074, pR: 0.6234, pQ: 0.4148, pS: 0.1933, pF: 0.1459, pC: 0.0835 },
  ESP: { pG: 0.9776, pR: 0.7759, pQ: 0.58, pS: 0.4193, pF: 0.3045, pC: 0.1885 },
  FRA: { pG: 0.9322, pR: 0.7023, pQ: 0.4351, pS: 0.2841, pF: 0.2276, pC: 0.1463 },
  GER: { pG: 0.972, pR: 0.6276, pQ: 0.3868, pS: 0.1781, pF: 0.0874, pC: 0.0376 },
  GHA: { pG: 0.0484, pR: 0.0054, pQ: 0.0004, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1277, pR: 0.1024, pQ: 0.024, pS: 0.0028, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8965, pR: 0.4816, pQ: 0.2207, pS: 0.1132, pF: 0.0308, pC: 0.0086 },
  IRQ: { pG: 0.1215, pR: 0.0166, pQ: 0.0022, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1058, pR: 0.0111, pQ: 0.0009, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7173, pR: 0.406, pQ: 0.1903, pS: 0.0728, pF: 0.0278, pC: 0.0094 },
  KOR: { pG: 0.8109, pR: 0.5233, pQ: 0.2514, pS: 0.1033, pF: 0.0236, pC: 0.0065 },
  KSA: { pG: 0.2058, pR: 0.0919, pQ: 0.0264, pS: 0.0073, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.974, pR: 0.7076, pQ: 0.4218, pS: 0.2844, pF: 0.1332, pC: 0.0623 },
  MEX: { pG: 0.92, pR: 0.6584, pQ: 0.4301, pS: 0.2104, pF: 0.0735, pC: 0.0273 },
  NED: { pG: 0.869, pR: 0.5932, pQ: 0.3795, pS: 0.179, pF: 0.1042, pC: 0.0488 },
  NOR: { pG: 0.287, pR: 0.0698, pQ: 0.0111, pS: 0.0025, pF: 0.0012, pC: 0.0004 },
  NZL: { pG: 0.1527, pR: 0.107, pQ: 0.0212, pS: 0.0036, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.284, pR: 0.0836, pQ: 0.0189, pS: 0.0028, pF: 0.001, pC: 0.0006 },
  PAR: { pG: 0.3644, pR: 0.1366, pQ: 0.0527, pS: 0.0201, pF: 0.0028, pC: 0.0005 },
  POR: { pG: 0.8581, pR: 0.478, pQ: 0.2505, pS: 0.1016, pF: 0.0671, pC: 0.0346 },
  QAT: { pG: 0.4301, pR: 0.1852, pQ: 0.0613, pS: 0.0178, pF: 0.0021, pC: 0.0001 },
  RSA: { pG: 0.4307, pR: 0.2821, pQ: 0.0912, pS: 0.0242, pF: 0.0027, pC: 0.0005 },
  SCO: { pG: 0.6338, pR: 0.4888, pQ: 0.2038, pS: 0.0776, pF: 0.0085, pC: 0.0018 },
  SEN: { pG: 0.6593, pR: 0.2754, pQ: 0.0836, pS: 0.0333, pF: 0.0192, pC: 0.0063 },
  SUI: { pG: 0.8425, pR: 0.5017, pQ: 0.293, pS: 0.1266, pF: 0.0427, pC: 0.0113 },
  SWE: { pG: 0.3464, pR: 0.1633, pQ: 0.0556, pS: 0.0179, pF: 0.0036, pC: 0.0008 },
  TUN: { pG: 0.2793, pR: 0.1313, pQ: 0.0451, pS: 0.012, pF: 0.0016, pC: 0.0002 },
  TUR: { pG: 0.6011, pR: 0.2572, pQ: 0.1162, pS: 0.0555, pF: 0.0145, pC: 0.0041 },
  URU: { pG: 0.8313, pR: 0.438, pQ: 0.1516, pS: 0.0705, pF: 0.0316, pC: 0.0118 },
  USA: { pG: 0.7656, pR: 0.3627, pQ: 0.1796, pS: 0.1035, pF: 0.0365, pC: 0.0119 },
  UZB: { pG: 0.1797, pR: 0.0318, pQ: 0.0066, pS: 0.0006, pF: 0.0003, pC: 0.0 },
};
