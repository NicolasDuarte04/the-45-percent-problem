// Auto-generated from M2 batch batch_20260616_214118Z on 2026-06-16T21:41:18Z.
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
  ALG: { pG: 0.4248, pR: 0.1036, pQ: 0.0191, pS: 0.0037, pF: 0.0014, pC: 0.0006 },
  ARG: { pG: 0.9538, pR: 0.6819, pQ: 0.4278, pS: 0.278, pF: 0.2208, pC: 0.1434 },
  AUS: { pG: 0.5538, pR: 0.2346, pQ: 0.1028, pS: 0.0499, pF: 0.0131, pC: 0.0041 },
  AUT: { pG: 0.5108, pR: 0.1408, pQ: 0.0256, pS: 0.0084, pF: 0.0041, pC: 0.001 },
  BEL: { pG: 0.9693, pR: 0.5606, pQ: 0.2787, pS: 0.1654, pF: 0.0819, pC: 0.0363 },
  BIH: { pG: 0.2669, pR: 0.1058, pQ: 0.0266, pS: 0.0062, pF: 0.0007, pC: 0.0 },
  BRA: { pG: 0.9739, pR: 0.7116, pQ: 0.439, pS: 0.301, pF: 0.1406, pC: 0.0661 },
  CAN: { pG: 0.6923, pR: 0.3455, pQ: 0.1444, pS: 0.0506, pF: 0.01, pC: 0.0023 },
  CIV: { pG: 0.7683, pR: 0.466, pQ: 0.1902, pS: 0.079, pF: 0.0147, pC: 0.0023 },
  COD: { pG: 0.2067, pR: 0.0374, pQ: 0.0073, pS: 0.0006, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7474, pR: 0.3372, pQ: 0.1385, pS: 0.0413, pF: 0.0251, pC: 0.0104 },
  CPV: { pG: 0.1278, pR: 0.0575, pQ: 0.0126, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7662, pR: 0.4142, pQ: 0.173, pS: 0.0603, pF: 0.0384, pC: 0.0174 },
  CUW: { pG: 0.174, pR: 0.1176, pQ: 0.0207, pS: 0.0038, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.62, pR: 0.4014, pQ: 0.1598, pS: 0.0497, pF: 0.0088, pC: 0.0013 },
  ECU: { pG: 0.8688, pR: 0.5016, pQ: 0.2317, pS: 0.0945, pF: 0.0233, pC: 0.0062 },
  EGY: { pG: 0.8203, pR: 0.4706, pQ: 0.2075, pS: 0.096, pF: 0.0208, pC: 0.0051 },
  ENG: { pG: 0.904, pR: 0.6233, pQ: 0.4019, pS: 0.1872, pF: 0.1407, pC: 0.08 },
  ESP: { pG: 0.9783, pR: 0.7771, pQ: 0.5916, pS: 0.4286, pF: 0.3099, pC: 0.1903 },
  FRA: { pG: 0.9331, pR: 0.6942, pQ: 0.4299, pS: 0.2798, pF: 0.2227, pC: 0.1442 },
  GER: { pG: 0.9739, pR: 0.6258, pQ: 0.3845, pS: 0.1803, pF: 0.0897, pC: 0.0392 },
  GHA: { pG: 0.0459, pR: 0.0054, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1244, pR: 0.0976, pQ: 0.021, pS: 0.0028, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8974, pR: 0.4746, pQ: 0.2224, pS: 0.113, pF: 0.0299, pC: 0.009 },
  IRQ: { pG: 0.1215, pR: 0.0186, pQ: 0.0012, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1106, pR: 0.0111, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7159, pR: 0.4042, pQ: 0.1924, pS: 0.0744, pF: 0.0288, pC: 0.0104 },
  KOR: { pG: 0.8138, pR: 0.5294, pQ: 0.2603, pS: 0.104, pF: 0.0254, pC: 0.0065 },
  KSA: { pG: 0.2205, pR: 0.0981, pQ: 0.0238, pS: 0.007, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9731, pR: 0.7039, pQ: 0.4281, pS: 0.2873, pF: 0.1298, pC: 0.0585 },
  MEX: { pG: 0.9178, pR: 0.6443, pQ: 0.4207, pS: 0.2018, pF: 0.075, pC: 0.0295 },
  NED: { pG: 0.8724, pR: 0.5964, pQ: 0.3781, pS: 0.1777, pF: 0.1033, pC: 0.0474 },
  NOR: { pG: 0.2773, pR: 0.07, pQ: 0.0128, pS: 0.002, pF: 0.0009, pC: 0.0002 },
  NZL: { pG: 0.1596, pR: 0.1152, pQ: 0.0233, pS: 0.0043, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2839, pR: 0.0881, pQ: 0.0195, pS: 0.0038, pF: 0.0016, pC: 0.0006 },
  PAR: { pG: 0.3767, pR: 0.1475, pQ: 0.0542, pS: 0.0207, pF: 0.0027, pC: 0.0007 },
  POR: { pG: 0.8601, pR: 0.4634, pQ: 0.2541, pS: 0.1018, pF: 0.0718, pC: 0.0352 },
  QAT: { pG: 0.4188, pR: 0.1805, pQ: 0.0572, pS: 0.0142, pF: 0.0016, pC: 0.0003 },
  RSA: { pG: 0.423, pR: 0.2716, pQ: 0.0904, pS: 0.0244, pF: 0.0021, pC: 0.0004 },
  SCO: { pG: 0.6274, pR: 0.4811, pQ: 0.2056, pS: 0.0735, pF: 0.0121, pC: 0.002 },
  SEN: { pG: 0.6681, pR: 0.2798, pQ: 0.0829, pS: 0.0323, pF: 0.0168, pC: 0.0063 },
  SUI: { pG: 0.8474, pR: 0.5215, pQ: 0.3019, pS: 0.1305, pF: 0.0425, pC: 0.0146 },
  SWE: { pG: 0.3463, pR: 0.1614, pQ: 0.0577, pS: 0.0167, pF: 0.0033, pC: 0.0005 },
  TUN: { pG: 0.2804, pR: 0.127, pQ: 0.0401, pS: 0.0114, pF: 0.001, pC: 0.0001 },
  TUR: { pG: 0.6092, pR: 0.26, pQ: 0.1062, pS: 0.0517, pF: 0.0139, pC: 0.0035 },
  URU: { pG: 0.8268, pR: 0.4463, pQ: 0.1447, pS: 0.0708, pF: 0.032, pC: 0.0119 },
  USA: { pG: 0.7615, pR: 0.3637, pQ: 0.1818, pS: 0.1057, pF: 0.0377, pC: 0.0122 },
  UZB: { pG: 0.1858, pR: 0.031, pQ: 0.0052, pS: 0.0006, pF: 0.0001, pC: 0.0 },
};
