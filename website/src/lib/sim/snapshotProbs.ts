// Auto-generated from M2 batch batch_20260616_121112Z on 2026-06-16T12:11:12Z.
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
  ALG: { pG: 0.4217, pR: 0.1007, pQ: 0.0164, pS: 0.0045, pF: 0.0023, pC: 0.0006 },
  ARG: { pG: 0.9525, pR: 0.6899, pQ: 0.4334, pS: 0.2748, pF: 0.2201, pC: 0.1407 },
  AUS: { pG: 0.5606, pR: 0.2313, pQ: 0.0934, pS: 0.0419, pF: 0.0114, pC: 0.0029 },
  AUT: { pG: 0.5111, pR: 0.1356, pQ: 0.0268, pS: 0.0075, pF: 0.0039, pC: 0.0008 },
  BEL: { pG: 0.9744, pR: 0.5714, pQ: 0.2871, pS: 0.1695, pF: 0.0782, pC: 0.0347 },
  BIH: { pG: 0.2709, pR: 0.1055, pQ: 0.0283, pS: 0.0056, pF: 0.0007, pC: 0.0001 },
  BRA: { pG: 0.9727, pR: 0.7128, pQ: 0.441, pS: 0.3071, pF: 0.1375, pC: 0.065 },
  CAN: { pG: 0.6841, pR: 0.3339, pQ: 0.1427, pS: 0.0476, pF: 0.011, pC: 0.0026 },
  CIV: { pG: 0.766, pR: 0.4639, pQ: 0.1951, pS: 0.0784, pF: 0.014, pC: 0.0029 },
  COD: { pG: 0.2073, pR: 0.0398, pQ: 0.0065, pS: 0.0006, pF: 0.0003, pC: 0.0001 },
  COL: { pG: 0.7472, pR: 0.339, pQ: 0.1384, pS: 0.0402, pF: 0.0259, pC: 0.0094 },
  CPV: { pG: 0.1327, pR: 0.0591, pQ: 0.0124, pS: 0.0022, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7558, pR: 0.3948, pQ: 0.1638, pS: 0.0557, pF: 0.0364, pC: 0.0168 },
  CUW: { pG: 0.1841, pR: 0.124, pQ: 0.0247, pS: 0.0035, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6215, pR: 0.4086, pQ: 0.1639, pS: 0.0532, pF: 0.0063, pC: 0.0011 },
  ECU: { pG: 0.8636, pR: 0.5003, pQ: 0.2242, pS: 0.0942, pF: 0.0237, pC: 0.0056 },
  EGY: { pG: 0.8268, pR: 0.4715, pQ: 0.2038, pS: 0.0982, pF: 0.0209, pC: 0.0049 },
  ENG: { pG: 0.9059, pR: 0.625, pQ: 0.4104, pS: 0.197, pF: 0.1509, pC: 0.0875 },
  ESP: { pG: 0.9762, pR: 0.7809, pQ: 0.5954, pS: 0.4318, pF: 0.3207, pC: 0.1968 },
  FRA: { pG: 0.9305, pR: 0.6967, pQ: 0.4269, pS: 0.2811, pF: 0.2258, pC: 0.1445 },
  GER: { pG: 0.9689, pR: 0.6235, pQ: 0.379, pS: 0.1751, pF: 0.0869, pC: 0.0375 },
  GHA: { pG: 0.049, pR: 0.0058, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1354, pR: 0.1022, pQ: 0.0228, pS: 0.0044, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8978, pR: 0.4793, pQ: 0.2224, pS: 0.1108, pF: 0.0307, pC: 0.0101 },
  IRQ: { pG: 0.1178, pR: 0.0169, pQ: 0.0021, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1147, pR: 0.0109, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7182, pR: 0.4063, pQ: 0.1924, pS: 0.0748, pF: 0.0297, pC: 0.0117 },
  KOR: { pG: 0.8069, pR: 0.5237, pQ: 0.2658, pS: 0.1114, pF: 0.026, pC: 0.0058 },
  KSA: { pG: 0.219, pR: 0.0974, pQ: 0.0254, pS: 0.0076, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9705, pR: 0.7009, pQ: 0.4291, pS: 0.2928, pF: 0.1289, pC: 0.0567 },
  MEX: { pG: 0.9222, pR: 0.6621, pQ: 0.4151, pS: 0.1953, pF: 0.0697, pC: 0.0242 },
  NED: { pG: 0.869, pR: 0.59, pQ: 0.3788, pS: 0.1772, pF: 0.1041, pC: 0.0488 },
  NOR: { pG: 0.2847, pR: 0.0703, pQ: 0.0121, pS: 0.0015, pF: 0.0004, pC: 0.0 },
  NZL: { pG: 0.1466, pR: 0.1039, pQ: 0.019, pS: 0.0036, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2893, pR: 0.0857, pQ: 0.0199, pS: 0.0021, pF: 0.0011, pC: 0.0001 },
  PAR: { pG: 0.3699, pR: 0.1443, pQ: 0.0503, pS: 0.019, pF: 0.0029, pC: 0.0008 },
  POR: { pG: 0.8591, pR: 0.4744, pQ: 0.2551, pS: 0.1001, pF: 0.0699, pC: 0.0368 },
  QAT: { pG: 0.4128, pR: 0.1733, pQ: 0.0584, pS: 0.0133, pF: 0.0012, pC: 0.0001 },
  RSA: { pG: 0.4328, pR: 0.2772, pQ: 0.096, pS: 0.0267, pF: 0.0029, pC: 0.0005 },
  SCO: { pG: 0.6351, pR: 0.4871, pQ: 0.2043, pS: 0.0765, pF: 0.0094, pC: 0.0013 },
  SEN: { pG: 0.667, pR: 0.279, pQ: 0.0816, pS: 0.0335, pF: 0.0185, pC: 0.0072 },
  SUI: { pG: 0.8488, pR: 0.5157, pQ: 0.3006, pS: 0.1305, pF: 0.0418, pC: 0.0137 },
  SWE: { pG: 0.3509, pR: 0.1646, pQ: 0.0573, pS: 0.0207, pF: 0.0032, pC: 0.0008 },
  TUN: { pG: 0.2793, pR: 0.1274, pQ: 0.0408, pS: 0.0114, pF: 0.0014, pC: 0.0004 },
  TUR: { pG: 0.5953, pR: 0.2556, pQ: 0.1109, pS: 0.0522, pF: 0.0149, pC: 0.0037 },
  URU: { pG: 0.8265, pR: 0.4365, pQ: 0.1422, pS: 0.0672, pF: 0.03, pC: 0.0106 },
  USA: { pG: 0.7605, pR: 0.3658, pQ: 0.1774, pS: 0.0963, pF: 0.0349, pC: 0.0122 },
  UZB: { pG: 0.1864, pR: 0.0355, pQ: 0.0054, pS: 0.001, pF: 0.0003, pC: 0.0 },
};
