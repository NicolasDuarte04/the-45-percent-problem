// Auto-generated from M2 batch batch_20260612_082233Z on 2026-06-12T08:22:33Z.
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
  ALG: { pG: 0.4277, pR: 0.0991, pQ: 0.0192, pS: 0.005, pF: 0.0026, pC: 0.0009 },
  ARG: { pG: 0.9534, pR: 0.6819, pQ: 0.4218, pS: 0.2714, pF: 0.2168, pC: 0.1372 },
  AUS: { pG: 0.551, pR: 0.2321, pQ: 0.096, pS: 0.0444, pF: 0.0104, pC: 0.003 },
  AUT: { pG: 0.5057, pR: 0.1421, pQ: 0.0257, pS: 0.007, pF: 0.0032, pC: 0.0009 },
  BEL: { pG: 0.9747, pR: 0.5663, pQ: 0.2835, pS: 0.1748, pF: 0.087, pC: 0.0373 },
  BIH: { pG: 0.2745, pR: 0.1078, pQ: 0.0283, pS: 0.0055, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.9764, pR: 0.7178, pQ: 0.4414, pS: 0.3044, pF: 0.1404, pC: 0.0619 },
  CAN: { pG: 0.6808, pR: 0.333, pQ: 0.1411, pS: 0.045, pF: 0.0099, pC: 0.0022 },
  CIV: { pG: 0.7661, pR: 0.4728, pQ: 0.192, pS: 0.0756, pF: 0.0122, pC: 0.0033 },
  COD: { pG: 0.2073, pR: 0.0371, pQ: 0.0063, pS: 0.0003, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7481, pR: 0.3302, pQ: 0.1371, pS: 0.0424, pF: 0.0252, pC: 0.0099 },
  CPV: { pG: 0.1344, pR: 0.0599, pQ: 0.0137, pS: 0.0039, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7669, pR: 0.4137, pQ: 0.1701, pS: 0.0565, pF: 0.0372, pC: 0.0171 },
  CUW: { pG: 0.1844, pR: 0.1255, pQ: 0.0228, pS: 0.0042, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.624, pR: 0.4115, pQ: 0.167, pS: 0.0566, pF: 0.0077, pC: 0.0012 },
  ECU: { pG: 0.8679, pR: 0.4975, pQ: 0.2233, pS: 0.0941, pF: 0.025, pC: 0.0069 },
  EGY: { pG: 0.8276, pR: 0.4813, pQ: 0.2146, pS: 0.0993, pF: 0.0206, pC: 0.0062 },
  ENG: { pG: 0.91, pR: 0.63, pQ: 0.4157, pS: 0.1995, pF: 0.1528, pC: 0.0911 },
  ESP: { pG: 0.9796, pR: 0.7762, pQ: 0.5906, pS: 0.4235, pF: 0.3135, pC: 0.1903 },
  FRA: { pG: 0.9326, pR: 0.6931, pQ: 0.4349, pS: 0.2814, pF: 0.2282, pC: 0.1477 },
  GER: { pG: 0.9724, pR: 0.6315, pQ: 0.3856, pS: 0.1766, pF: 0.0879, pC: 0.0347 },
  GHA: { pG: 0.0524, pR: 0.0051, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1366, pR: 0.1094, pQ: 0.0222, pS: 0.004, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8932, pR: 0.4712, pQ: 0.2145, pS: 0.1073, pF: 0.0281, pC: 0.008 },
  IRQ: { pG: 0.1184, pR: 0.0204, pQ: 0.0017, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1132, pR: 0.0115, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7211, pR: 0.4073, pQ: 0.1922, pS: 0.0751, pF: 0.0318, pC: 0.0106 },
  KOR: { pG: 0.8104, pR: 0.5329, pQ: 0.2584, pS: 0.0971, pF: 0.0201, pC: 0.0052 },
  KSA: { pG: 0.2151, pR: 0.098, pQ: 0.0268, pS: 0.0062, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9699, pR: 0.7045, pQ: 0.4339, pS: 0.2985, pF: 0.131, pC: 0.062 },
  MEX: { pG: 0.9249, pR: 0.6559, pQ: 0.4235, pS: 0.2056, pF: 0.0698, pC: 0.0253 },
  NED: { pG: 0.8663, pR: 0.5843, pQ: 0.375, pS: 0.1737, pF: 0.0998, pC: 0.0453 },
  NOR: { pG: 0.2822, pR: 0.071, pQ: 0.012, pS: 0.0028, pF: 0.001, pC: 0.0003 },
  NZL: { pG: 0.1473, pR: 0.1061, pQ: 0.0202, pS: 0.0034, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2707, pR: 0.0829, pQ: 0.0169, pS: 0.0018, pF: 0.001, pC: 0.0001 },
  PAR: { pG: 0.3719, pR: 0.138, pQ: 0.0499, pS: 0.0183, pF: 0.004, pC: 0.0012 },
  POR: { pG: 0.8572, pR: 0.4697, pQ: 0.2478, pS: 0.0984, pF: 0.0684, pC: 0.0355 },
  QAT: { pG: 0.4213, pR: 0.1828, pQ: 0.0579, pS: 0.0144, pF: 0.0013, pC: 0.0 },
  RSA: { pG: 0.4268, pR: 0.2735, pQ: 0.0878, pS: 0.0239, pF: 0.0019, pC: 0.0001 },
  SCO: { pG: 0.6287, pR: 0.4795, pQ: 0.2039, pS: 0.0772, pF: 0.0109, pC: 0.0017 },
  SEN: { pG: 0.6668, pR: 0.2809, pQ: 0.0839, pS: 0.0325, pF: 0.0193, pC: 0.0077 },
  SUI: { pG: 0.8373, pR: 0.5026, pQ: 0.2963, pS: 0.1213, pF: 0.0415, pC: 0.0145 },
  SWE: { pG: 0.3475, pR: 0.1598, pQ: 0.0536, pS: 0.0158, pF: 0.0031, pC: 0.0006 },
  TUN: { pG: 0.2743, pR: 0.1213, pQ: 0.0407, pS: 0.0129, pF: 0.0007, pC: 0.0 },
  TUR: { pG: 0.6008, pR: 0.251, pQ: 0.109, pS: 0.0523, pF: 0.0128, pC: 0.0041 },
  URU: { pG: 0.8281, pR: 0.441, pQ: 0.1509, pS: 0.0756, pF: 0.0321, pC: 0.0104 },
  USA: { pG: 0.7647, pR: 0.3677, pQ: 0.1834, pS: 0.1095, pF: 0.0391, pC: 0.0153 },
  UZB: { pG: 0.1874, pR: 0.0313, pQ: 0.0055, pS: 0.0007, pF: 0.0001, pC: 0.0001 },
};
