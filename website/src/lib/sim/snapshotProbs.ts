// Auto-generated from M2 batch batch_20260614_033521Z on 2026-06-14T03:35:21Z.
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
  ALG: { pG: 0.4322, pR: 0.1026, pQ: 0.0188, pS: 0.0039, pF: 0.002, pC: 0.0005 },
  ARG: { pG: 0.9492, pR: 0.6673, pQ: 0.4139, pS: 0.2618, pF: 0.21, pC: 0.1335 },
  AUS: { pG: 0.5586, pR: 0.2243, pQ: 0.0936, pS: 0.0434, pF: 0.0097, pC: 0.0026 },
  AUT: { pG: 0.5059, pR: 0.1341, pQ: 0.0258, pS: 0.0085, pF: 0.0046, pC: 0.0011 },
  BEL: { pG: 0.9726, pR: 0.5721, pQ: 0.287, pS: 0.1681, pF: 0.085, pC: 0.0375 },
  BIH: { pG: 0.2707, pR: 0.1108, pQ: 0.0282, pS: 0.0059, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9722, pR: 0.7163, pQ: 0.4454, pS: 0.3048, pF: 0.1431, pC: 0.0649 },
  CAN: { pG: 0.6857, pR: 0.3346, pQ: 0.1487, pS: 0.0477, pF: 0.0104, pC: 0.002 },
  CIV: { pG: 0.7711, pR: 0.4688, pQ: 0.1873, pS: 0.0751, pF: 0.0134, pC: 0.0022 },
  COD: { pG: 0.2038, pR: 0.0369, pQ: 0.0085, pS: 0.0007, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7457, pR: 0.3248, pQ: 0.1335, pS: 0.0428, pF: 0.0235, pC: 0.0102 },
  CPV: { pG: 0.1298, pR: 0.0579, pQ: 0.0134, pS: 0.0029, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7641, pR: 0.4112, pQ: 0.1754, pS: 0.0584, pF: 0.0364, pC: 0.0181 },
  CUW: { pG: 0.1731, pR: 0.1186, pQ: 0.0247, pS: 0.0039, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6327, pR: 0.412, pQ: 0.1658, pS: 0.0572, pF: 0.0083, pC: 0.0024 },
  ECU: { pG: 0.8692, pR: 0.4963, pQ: 0.2286, pS: 0.0967, pF: 0.0241, pC: 0.0073 },
  EGY: { pG: 0.8312, pR: 0.4759, pQ: 0.2129, pS: 0.1005, pF: 0.0227, pC: 0.0055 },
  ENG: { pG: 0.9084, pR: 0.6247, pQ: 0.4077, pS: 0.1949, pF: 0.1477, pC: 0.0865 },
  ESP: { pG: 0.979, pR: 0.773, pQ: 0.5859, pS: 0.4241, pF: 0.3082, pC: 0.1895 },
  FRA: { pG: 0.9366, pR: 0.709, pQ: 0.4398, pS: 0.2897, pF: 0.2377, pC: 0.1534 },
  GER: { pG: 0.9697, pR: 0.632, pQ: 0.3796, pS: 0.1785, pF: 0.0909, pC: 0.037 },
  GHA: { pG: 0.0505, pR: 0.0066, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1239, pR: 0.0997, pQ: 0.0236, pS: 0.0042, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8913, pR: 0.4763, pQ: 0.2186, pS: 0.1116, pF: 0.0294, pC: 0.0084 },
  IRQ: { pG: 0.1164, pR: 0.0184, pQ: 0.0022, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1127, pR: 0.0109, pQ: 0.0003, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7064, pR: 0.4009, pQ: 0.1917, pS: 0.0711, pF: 0.0293, pC: 0.0091 },
  KOR: { pG: 0.8107, pR: 0.5234, pQ: 0.2513, pS: 0.0999, pF: 0.0228, pC: 0.0065 },
  KSA: { pG: 0.2116, pR: 0.0942, pQ: 0.0237, pS: 0.0057, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.974, pR: 0.7162, pQ: 0.4331, pS: 0.2985, pF: 0.1352, pC: 0.0618 },
  MEX: { pG: 0.9216, pR: 0.6543, pQ: 0.4169, pS: 0.2009, pF: 0.0681, pC: 0.0257 },
  NED: { pG: 0.8717, pR: 0.5946, pQ: 0.3813, pS: 0.1794, pF: 0.1026, pC: 0.0463 },
  NOR: { pG: 0.2772, pR: 0.0728, pQ: 0.0126, pS: 0.0022, pF: 0.001, pC: 0.0002 },
  NZL: { pG: 0.1528, pR: 0.1092, pQ: 0.0204, pS: 0.0037, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.277, pR: 0.0864, pQ: 0.0201, pS: 0.0029, pF: 0.0011, pC: 0.0004 },
  PAR: { pG: 0.3715, pR: 0.1459, pQ: 0.0502, pS: 0.0194, pF: 0.0028, pC: 0.0008 },
  POR: { pG: 0.8583, pR: 0.4735, pQ: 0.2492, pS: 0.1002, pF: 0.0685, pC: 0.0361 },
  QAT: { pG: 0.4163, pR: 0.1791, pQ: 0.0579, pS: 0.0137, pF: 0.0016, pC: 0.0005 },
  RSA: { pG: 0.4158, pR: 0.273, pQ: 0.085, pS: 0.022, pF: 0.0023, pC: 0.0005 },
  SCO: { pG: 0.6387, pR: 0.4912, pQ: 0.2137, pS: 0.0774, pF: 0.0102, pC: 0.0014 },
  SEN: { pG: 0.6698, pR: 0.2849, pQ: 0.0866, pS: 0.0333, pF: 0.019, pC: 0.0081 },
  SUI: { pG: 0.8465, pR: 0.5128, pQ: 0.3011, pS: 0.1237, pF: 0.0401, pC: 0.0122 },
  SWE: { pG: 0.3545, pR: 0.1634, pQ: 0.0592, pS: 0.0187, pF: 0.0035, pC: 0.0006 },
  TUN: { pG: 0.2843, pR: 0.1254, pQ: 0.0417, pS: 0.013, pF: 0.0023, pC: 0.0005 },
  TUR: { pG: 0.604, pR: 0.2501, pQ: 0.1082, pS: 0.053, pF: 0.0141, pC: 0.004 },
  URU: { pG: 0.8317, pR: 0.4414, pQ: 0.144, pS: 0.0691, pF: 0.0304, pC: 0.0098 },
  USA: { pG: 0.7571, pR: 0.3563, pQ: 0.1773, pS: 0.1062, pF: 0.0364, pC: 0.0129 },
  UZB: { pG: 0.1922, pR: 0.0359, pQ: 0.0052, pS: 0.0003, pF: 0.0, pC: 0.0 },
};
