// Auto-generated from M2 batch batch_20260615_100017Z on 2026-06-15T10:00:17Z.
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
  ALG: { pG: 0.4193, pR: 0.0997, pQ: 0.0172, pS: 0.0039, pF: 0.0019, pC: 0.0006 },
  ARG: { pG: 0.9538, pR: 0.6738, pQ: 0.4153, pS: 0.2678, pF: 0.2177, pC: 0.1357 },
  AUS: { pG: 0.5577, pR: 0.2335, pQ: 0.0968, pS: 0.0469, pF: 0.0113, pC: 0.0031 },
  AUT: { pG: 0.514, pR: 0.136, pQ: 0.0267, pS: 0.0077, pF: 0.0041, pC: 0.0018 },
  BEL: { pG: 0.9719, pR: 0.5669, pQ: 0.2897, pS: 0.1675, pF: 0.0807, pC: 0.0327 },
  BIH: { pG: 0.2721, pR: 0.1129, pQ: 0.0294, pS: 0.0069, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.975, pR: 0.72, pQ: 0.4377, pS: 0.302, pF: 0.1364, pC: 0.0663 },
  CAN: { pG: 0.6676, pR: 0.3342, pQ: 0.1451, pS: 0.0494, pF: 0.0113, pC: 0.0027 },
  CIV: { pG: 0.7741, pR: 0.4727, pQ: 0.1957, pS: 0.0795, pF: 0.0129, pC: 0.0023 },
  COD: { pG: 0.2065, pR: 0.0385, pQ: 0.0072, pS: 0.0008, pF: 0.0003, pC: 0.0001 },
  COL: { pG: 0.7539, pR: 0.3394, pQ: 0.1383, pS: 0.0424, pF: 0.0248, pC: 0.0112 },
  CPV: { pG: 0.1269, pR: 0.0528, pQ: 0.0122, pS: 0.0032, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7587, pR: 0.4014, pQ: 0.1742, pS: 0.0605, pF: 0.0374, pC: 0.0179 },
  CUW: { pG: 0.1733, pR: 0.1192, pQ: 0.023, pS: 0.0044, pF: 0.0004, pC: 0.0001 },
  CZE: { pG: 0.6167, pR: 0.3988, pQ: 0.158, pS: 0.0539, pF: 0.0076, pC: 0.0015 },
  ECU: { pG: 0.8608, pR: 0.4952, pQ: 0.2262, pS: 0.0942, pF: 0.0256, pC: 0.0064 },
  EGY: { pG: 0.8281, pR: 0.4799, pQ: 0.2102, pS: 0.0953, pF: 0.0195, pC: 0.0054 },
  ENG: { pG: 0.9084, pR: 0.6283, pQ: 0.4063, pS: 0.1886, pF: 0.1456, pC: 0.0849 },
  ESP: { pG: 0.9811, pR: 0.7765, pQ: 0.5849, pS: 0.4218, pF: 0.3093, pC: 0.1898 },
  FRA: { pG: 0.9329, pR: 0.7096, pQ: 0.4443, pS: 0.2907, pF: 0.2387, pC: 0.153 },
  GER: { pG: 0.9713, pR: 0.6226, pQ: 0.378, pS: 0.1834, pF: 0.0953, pC: 0.0416 },
  GHA: { pG: 0.0499, pR: 0.005, pQ: 0.0007, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  HAI: { pG: 0.1279, pR: 0.1019, pQ: 0.0214, pS: 0.0044, pF: 0.0003, pC: 0.0001 },
  IRN: { pG: 0.894, pR: 0.4732, pQ: 0.214, pS: 0.1082, pF: 0.0267, pC: 0.0073 },
  IRQ: { pG: 0.123, pR: 0.0206, pQ: 0.0015, pS: 0.0005, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1129, pR: 0.0127, pQ: 0.0006, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7252, pR: 0.4078, pQ: 0.191, pS: 0.0727, pF: 0.0307, pC: 0.0102 },
  KOR: { pG: 0.8053, pR: 0.5228, pQ: 0.2555, pS: 0.1018, pF: 0.0241, pC: 0.0058 },
  KSA: { pG: 0.2155, pR: 0.0989, pQ: 0.0265, pS: 0.0072, pF: 0.0008, pC: 0.0001 },
  MAR: { pG: 0.9712, pR: 0.6994, pQ: 0.4295, pS: 0.2961, pF: 0.1315, pC: 0.0613 },
  MEX: { pG: 0.9247, pR: 0.6511, pQ: 0.4255, pS: 0.2025, pF: 0.0742, pC: 0.0267 },
  NED: { pG: 0.8713, pR: 0.6017, pQ: 0.3865, pS: 0.1792, pF: 0.1055, pC: 0.0478 },
  NOR: { pG: 0.2733, pR: 0.0681, pQ: 0.0105, pS: 0.0031, pF: 0.0014, pC: 0.0003 },
  NZL: { pG: 0.1534, pR: 0.1106, pQ: 0.0237, pS: 0.0043, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.283, pR: 0.0875, pQ: 0.0205, pS: 0.0036, pF: 0.0016, pC: 0.0002 },
  PAR: { pG: 0.3678, pR: 0.1435, pQ: 0.0506, pS: 0.0182, pF: 0.0026, pC: 0.0004 },
  POR: { pG: 0.8566, pR: 0.4663, pQ: 0.2468, pS: 0.0942, pF: 0.066, pC: 0.0352 },
  QAT: { pG: 0.4355, pR: 0.1914, pQ: 0.0615, pS: 0.0169, pF: 0.0018, pC: 0.0004 },
  RSA: { pG: 0.4303, pR: 0.2807, pQ: 0.0886, pS: 0.0244, pF: 0.0016, pC: 0.0004 },
  SCO: { pG: 0.633, pR: 0.4823, pQ: 0.2114, pS: 0.0813, pF: 0.0103, pC: 0.0017 },
  SEN: { pG: 0.6708, pR: 0.2795, pQ: 0.0839, pS: 0.0356, pF: 0.0229, pC: 0.0083 },
  SUI: { pG: 0.8478, pR: 0.5081, pQ: 0.299, pS: 0.1214, pF: 0.0385, pC: 0.0117 },
  SWE: { pG: 0.3376, pR: 0.1556, pQ: 0.0556, pS: 0.0155, pF: 0.0026, pC: 0.0004 },
  TUN: { pG: 0.2864, pR: 0.1252, pQ: 0.0406, pS: 0.0128, pF: 0.0014, pC: 0.0002 },
  TUR: { pG: 0.601, pR: 0.2529, pQ: 0.1065, pS: 0.0503, pF: 0.0125, pC: 0.0034 },
  URU: { pG: 0.8291, pR: 0.4412, pQ: 0.1422, pS: 0.0699, pF: 0.0302, pC: 0.0104 },
  USA: { pG: 0.7664, pR: 0.3665, pQ: 0.1835, pS: 0.1045, pF: 0.0309, pC: 0.0106 },
  UZB: { pG: 0.183, pR: 0.0336, pQ: 0.006, pS: 0.0004, pF: 0.0001, pC: 0.0 },
};
