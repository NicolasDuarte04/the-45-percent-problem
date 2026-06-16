// Auto-generated from M2 batch batch_20260616_180242Z on 2026-06-16T18:02:42Z.
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
  ALG: { pG: 0.4292, pR: 0.104, pQ: 0.0191, pS: 0.0045, pF: 0.0025, pC: 0.0012 },
  ARG: { pG: 0.9501, pR: 0.6704, pQ: 0.4158, pS: 0.2702, pF: 0.215, pC: 0.1427 },
  AUS: { pG: 0.5542, pR: 0.2313, pQ: 0.0955, pS: 0.0466, pF: 0.0106, pC: 0.0034 },
  AUT: { pG: 0.5116, pR: 0.1325, pQ: 0.0249, pS: 0.0069, pF: 0.0035, pC: 0.0015 },
  BEL: { pG: 0.9739, pR: 0.5661, pQ: 0.2843, pS: 0.1681, pF: 0.084, pC: 0.0376 },
  BIH: { pG: 0.2695, pR: 0.0998, pQ: 0.0241, pS: 0.0036, pF: 0.0, pC: 0.0 },
  BRA: { pG: 0.974, pR: 0.7108, pQ: 0.4392, pS: 0.305, pF: 0.1425, pC: 0.0658 },
  CAN: { pG: 0.6837, pR: 0.3417, pQ: 0.1473, pS: 0.0466, pF: 0.0111, pC: 0.0025 },
  CIV: { pG: 0.7768, pR: 0.4722, pQ: 0.193, pS: 0.0799, pF: 0.0146, pC: 0.0029 },
  COD: { pG: 0.2089, pR: 0.0412, pQ: 0.0066, pS: 0.0003, pF: 0.0003, pC: 0.0 },
  COL: { pG: 0.7419, pR: 0.3274, pQ: 0.1365, pS: 0.0425, pF: 0.025, pC: 0.0098 },
  CPV: { pG: 0.1326, pR: 0.0576, pQ: 0.0151, pS: 0.0029, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7615, pR: 0.4127, pQ: 0.1671, pS: 0.0538, pF: 0.0351, pC: 0.0152 },
  CUW: { pG: 0.1752, pR: 0.119, pQ: 0.0212, pS: 0.0038, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.626, pR: 0.4064, pQ: 0.1616, pS: 0.0554, pF: 0.0072, pC: 0.0011 },
  ECU: { pG: 0.8683, pR: 0.4977, pQ: 0.2208, pS: 0.0963, pF: 0.0265, pC: 0.0078 },
  EGY: { pG: 0.829, pR: 0.4814, pQ: 0.2174, pS: 0.1009, pF: 0.0204, pC: 0.0047 },
  ENG: { pG: 0.9095, pR: 0.6294, pQ: 0.4115, pS: 0.2005, pF: 0.1528, pC: 0.0887 },
  ESP: { pG: 0.9765, pR: 0.774, pQ: 0.5912, pS: 0.4287, pF: 0.308, pC: 0.1857 },
  FRA: { pG: 0.9322, pR: 0.7044, pQ: 0.4424, pS: 0.283, pF: 0.2291, pC: 0.1475 },
  GER: { pG: 0.971, pR: 0.622, pQ: 0.381, pS: 0.1798, pF: 0.0918, pC: 0.0377 },
  GHA: { pG: 0.0482, pR: 0.0065, pQ: 0.0009, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1289, pR: 0.0985, pQ: 0.0207, pS: 0.0037, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8924, pR: 0.4719, pQ: 0.2169, pS: 0.1113, pF: 0.0313, pC: 0.0085 },
  IRQ: { pG: 0.1185, pR: 0.0181, pQ: 0.0016, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1091, pR: 0.009, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7167, pR: 0.4014, pQ: 0.1804, pS: 0.0668, pF: 0.0281, pC: 0.0091 },
  KOR: { pG: 0.8078, pR: 0.5284, pQ: 0.2549, pS: 0.0973, pF: 0.0225, pC: 0.0057 },
  KSA: { pG: 0.2178, pR: 0.0981, pQ: 0.0239, pS: 0.0068, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9703, pR: 0.7071, pQ: 0.4234, pS: 0.2878, pF: 0.1277, pC: 0.0576 },
  MEX: { pG: 0.9219, pR: 0.6525, pQ: 0.4222, pS: 0.2049, pF: 0.0715, pC: 0.0275 },
  NED: { pG: 0.8666, pR: 0.6012, pQ: 0.3899, pS: 0.1774, pF: 0.1026, pC: 0.0485 },
  NOR: { pG: 0.2781, pR: 0.0748, pQ: 0.0123, pS: 0.0024, pF: 0.0011, pC: 0.0003 },
  NZL: { pG: 0.1523, pR: 0.1082, pQ: 0.021, pS: 0.005, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2808, pR: 0.085, pQ: 0.0188, pS: 0.0032, pF: 0.0011, pC: 0.0004 },
  PAR: { pG: 0.3662, pR: 0.1395, pQ: 0.0537, pS: 0.0177, pF: 0.0027, pC: 0.0004 },
  POR: { pG: 0.861, pR: 0.4674, pQ: 0.2529, pS: 0.1004, pF: 0.0676, pC: 0.0329 },
  QAT: { pG: 0.4114, pR: 0.1759, pQ: 0.0543, pS: 0.0123, pF: 0.0018, pC: 0.0002 },
  RSA: { pG: 0.4333, pR: 0.282, pQ: 0.0921, pS: 0.0257, pF: 0.0021, pC: 0.0003 },
  SCO: { pG: 0.6363, pR: 0.485, pQ: 0.2104, pS: 0.078, pF: 0.011, pC: 0.0018 },
  SEN: { pG: 0.6712, pR: 0.2868, pQ: 0.0834, pS: 0.0317, pF: 0.0206, pC: 0.0086 },
  SUI: { pG: 0.8464, pR: 0.5133, pQ: 0.3028, pS: 0.127, pF: 0.0408, pC: 0.0147 },
  SWE: { pG: 0.3488, pR: 0.1628, pQ: 0.0561, pS: 0.0151, pF: 0.0021, pC: 0.0004 },
  TUN: { pG: 0.2766, pR: 0.1237, pQ: 0.0407, pS: 0.0117, pF: 0.0014, pC: 0.0005 },
  TUR: { pG: 0.6025, pR: 0.2551, pQ: 0.1124, pS: 0.0582, pF: 0.0149, pC: 0.0038 },
  URU: { pG: 0.8255, pR: 0.4427, pQ: 0.1471, pS: 0.0723, pF: 0.0316, pC: 0.0112 },
  USA: { pG: 0.7676, pR: 0.3727, pQ: 0.1854, pS: 0.1034, pF: 0.0362, pC: 0.0117 },
  UZB: { pG: 0.1882, pR: 0.0304, pQ: 0.0057, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
