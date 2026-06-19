// Auto-generated from M2 batch batch_20260619_194443Z on 2026-06-19T19:44:43Z.
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
  ALG: { pG: 0.4271, pR: 0.1046, pQ: 0.0192, pS: 0.0043, pF: 0.0022, pC: 0.0006 },
  ARG: { pG: 0.9526, pR: 0.6739, pQ: 0.4197, pS: 0.2687, pF: 0.2207, pC: 0.1441 },
  AUS: { pG: 0.5641, pR: 0.235, pQ: 0.1007, pS: 0.0459, pF: 0.011, pC: 0.0029 },
  AUT: { pG: 0.5156, pR: 0.1432, pQ: 0.0282, pS: 0.0088, pF: 0.0038, pC: 0.0009 },
  BEL: { pG: 0.972, pR: 0.565, pQ: 0.2862, pS: 0.1643, pF: 0.0804, pC: 0.034 },
  BIH: { pG: 0.269, pR: 0.1096, pQ: 0.028, pS: 0.0052, pF: 0.0007, pC: 0.0004 },
  BRA: { pG: 0.9737, pR: 0.7207, pQ: 0.4468, pS: 0.3037, pF: 0.139, pC: 0.07 },
  CAN: { pG: 0.6768, pR: 0.3292, pQ: 0.141, pS: 0.0471, pF: 0.0103, pC: 0.003 },
  CIV: { pG: 0.766, pR: 0.4694, pQ: 0.1944, pS: 0.0779, pF: 0.0123, pC: 0.0029 },
  COD: { pG: 0.2118, pR: 0.035, pQ: 0.0071, pS: 0.001, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7419, pR: 0.328, pQ: 0.1344, pS: 0.0415, pF: 0.0268, pC: 0.0099 },
  CPV: { pG: 0.1333, pR: 0.055, pQ: 0.0124, pS: 0.003, pF: 0.0001, pC: 0.0001 },
  CRO: { pG: 0.7674, pR: 0.4113, pQ: 0.1747, pS: 0.0576, pF: 0.0357, pC: 0.0151 },
  CUW: { pG: 0.1719, pR: 0.1171, pQ: 0.021, pS: 0.0039, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.619, pR: 0.3956, pQ: 0.1533, pS: 0.0517, pF: 0.007, pC: 0.0011 },
  ECU: { pG: 0.8712, pR: 0.5045, pQ: 0.2266, pS: 0.0958, pF: 0.0243, pC: 0.0069 },
  EGY: { pG: 0.8302, pR: 0.4785, pQ: 0.2129, pS: 0.1021, pF: 0.0194, pC: 0.0047 },
  ENG: { pG: 0.9093, pR: 0.6354, pQ: 0.4144, pS: 0.1983, pF: 0.1478, pC: 0.0834 },
  ESP: { pG: 0.98, pR: 0.7706, pQ: 0.5809, pS: 0.4138, pF: 0.3004, pC: 0.1841 },
  FRA: { pG: 0.9318, pR: 0.6988, pQ: 0.4345, pS: 0.2822, pF: 0.2288, pC: 0.1427 },
  GER: { pG: 0.974, pR: 0.6342, pQ: 0.3958, pS: 0.1851, pF: 0.0921, pC: 0.0407 },
  GHA: { pG: 0.0536, pR: 0.007, pQ: 0.0004, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  HAI: { pG: 0.1279, pR: 0.0997, pQ: 0.0201, pS: 0.0025, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.898, pR: 0.4756, pQ: 0.2175, pS: 0.1138, pF: 0.0335, pC: 0.0087 },
  IRQ: { pG: 0.1237, pR: 0.0173, pQ: 0.0017, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1047, pR: 0.0114, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7122, pR: 0.4041, pQ: 0.1881, pS: 0.0775, pF: 0.0309, pC: 0.0109 },
  KOR: { pG: 0.8049, pR: 0.5272, pQ: 0.2629, pS: 0.106, pF: 0.0238, pC: 0.0062 },
  KSA: { pG: 0.2158, pR: 0.0964, pQ: 0.0236, pS: 0.0067, pF: 0.001, pC: 0.0003 },
  MAR: { pG: 0.9706, pR: 0.7045, pQ: 0.4207, pS: 0.2893, pF: 0.1265, pC: 0.0582 },
  MEX: { pG: 0.9236, pR: 0.6592, pQ: 0.4202, pS: 0.1971, pF: 0.07, pC: 0.027 },
  NED: { pG: 0.8681, pR: 0.5856, pQ: 0.3756, pS: 0.1816, pF: 0.1064, pC: 0.0527 },
  NOR: { pG: 0.2824, pR: 0.0697, pQ: 0.0109, pS: 0.003, pF: 0.0019, pC: 0.0004 },
  NZL: { pG: 0.1528, pR: 0.111, pQ: 0.0202, pS: 0.0035, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2697, pR: 0.0857, pQ: 0.0187, pS: 0.0025, pF: 0.0009, pC: 0.0003 },
  PAR: { pG: 0.3689, pR: 0.1391, pQ: 0.0519, pS: 0.021, pF: 0.0025, pC: 0.0003 },
  POR: { pG: 0.8553, pR: 0.4666, pQ: 0.2468, pS: 0.099, pF: 0.0702, pC: 0.0355 },
  QAT: { pG: 0.4254, pR: 0.1837, pQ: 0.057, pS: 0.015, pF: 0.0021, pC: 0.0001 },
  RSA: { pG: 0.4308, pR: 0.2803, pQ: 0.0894, pS: 0.0238, pF: 0.0023, pC: 0.0001 },
  SCO: { pG: 0.631, pR: 0.485, pQ: 0.2152, pS: 0.078, pF: 0.0109, pC: 0.0015 },
  SEN: { pG: 0.6621, pR: 0.2811, pQ: 0.0854, pS: 0.0326, pF: 0.0214, pC: 0.0088 },
  SUI: { pG: 0.8505, pR: 0.5152, pQ: 0.2986, pS: 0.1226, pF: 0.043, pC: 0.0124 },
  SWE: { pG: 0.3546, pR: 0.1605, pQ: 0.0543, pS: 0.0175, pF: 0.0032, pC: 0.0005 },
  TUN: { pG: 0.282, pR: 0.1246, pQ: 0.0389, pS: 0.0113, pF: 0.0014, pC: 0.0002 },
  TUR: { pG: 0.6043, pR: 0.2534, pQ: 0.1107, pS: 0.0543, pF: 0.0129, pC: 0.0036 },
  URU: { pG: 0.8179, pR: 0.4479, pQ: 0.1516, pS: 0.0734, pF: 0.0321, pC: 0.0104 },
  USA: { pG: 0.7595, pR: 0.3626, pQ: 0.1835, pS: 0.1056, pF: 0.0395, pC: 0.0144 },
  UZB: { pG: 0.191, pR: 0.031, pQ: 0.0035, pS: 0.0003, pF: 0.0, pC: 0.0 },
};
