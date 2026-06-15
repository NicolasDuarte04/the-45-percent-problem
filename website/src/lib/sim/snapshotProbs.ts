// Auto-generated from M2 batch batch_20260615_194520Z on 2026-06-15T19:45:20Z.
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
  ALG: { pG: 0.4238, pR: 0.0963, pQ: 0.0188, pS: 0.004, pF: 0.002, pC: 0.0003 },
  ARG: { pG: 0.9541, pR: 0.6823, pQ: 0.4274, pS: 0.2748, pF: 0.2185, pC: 0.1414 },
  AUS: { pG: 0.5519, pR: 0.223, pQ: 0.0953, pS: 0.0445, pF: 0.0115, pC: 0.0033 },
  AUT: { pG: 0.5125, pR: 0.137, pQ: 0.0286, pS: 0.0073, pF: 0.0039, pC: 0.0008 },
  BEL: { pG: 0.9717, pR: 0.5648, pQ: 0.2836, pS: 0.1644, pF: 0.082, pC: 0.0351 },
  BIH: { pG: 0.2704, pR: 0.1036, pQ: 0.0258, pS: 0.0047, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9737, pR: 0.7161, pQ: 0.4438, pS: 0.3076, pF: 0.1425, pC: 0.0668 },
  CAN: { pG: 0.6808, pR: 0.3369, pQ: 0.147, pS: 0.0499, pF: 0.0115, pC: 0.0023 },
  CIV: { pG: 0.7728, pR: 0.4663, pQ: 0.1983, pS: 0.0816, pF: 0.0144, pC: 0.0029 },
  COD: { pG: 0.1988, pR: 0.0386, pQ: 0.0054, pS: 0.0011, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7524, pR: 0.327, pQ: 0.1346, pS: 0.043, pF: 0.0248, pC: 0.01 },
  CPV: { pG: 0.1292, pR: 0.0573, pQ: 0.0115, pS: 0.0026, pF: 0.0002, pC: 0.0001 },
  CRO: { pG: 0.7594, pR: 0.408, pQ: 0.1737, pS: 0.0625, pF: 0.039, pC: 0.0183 },
  CUW: { pG: 0.1771, pR: 0.1205, pQ: 0.0251, pS: 0.0039, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6304, pR: 0.4086, pQ: 0.1553, pS: 0.0523, pF: 0.0063, pC: 0.001 },
  ECU: { pG: 0.8645, pR: 0.4967, pQ: 0.2217, pS: 0.0953, pF: 0.0246, pC: 0.0067 },
  EGY: { pG: 0.8292, pR: 0.4804, pQ: 0.2147, pS: 0.0967, pF: 0.0192, pC: 0.0046 },
  ENG: { pG: 0.9086, pR: 0.6252, pQ: 0.4043, pS: 0.1891, pF: 0.1474, pC: 0.0852 },
  ESP: { pG: 0.9784, pR: 0.7757, pQ: 0.5835, pS: 0.42, pF: 0.3062, pC: 0.1889 },
  FRA: { pG: 0.931, pR: 0.7015, pQ: 0.4272, pS: 0.2778, pF: 0.2242, pC: 0.1462 },
  GER: { pG: 0.9733, pR: 0.6278, pQ: 0.3851, pS: 0.1811, pF: 0.0932, pC: 0.0392 },
  GHA: { pG: 0.051, pR: 0.0065, pQ: 0.0004, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  HAI: { pG: 0.1317, pR: 0.1037, pQ: 0.021, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8977, pR: 0.4792, pQ: 0.2184, pS: 0.1068, pF: 0.029, pC: 0.0096 },
  IRQ: { pG: 0.1173, pR: 0.0185, pQ: 0.0016, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1096, pR: 0.0123, pQ: 0.0011, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.708, pR: 0.4067, pQ: 0.1908, pS: 0.0718, pF: 0.0299, pC: 0.0101 },
  KOR: { pG: 0.8029, pR: 0.5231, pQ: 0.2542, pS: 0.1058, pF: 0.0228, pC: 0.0069 },
  KSA: { pG: 0.2102, pR: 0.0931, pQ: 0.0224, pS: 0.0068, pF: 0.001, pC: 0.0 },
  MAR: { pG: 0.977, pR: 0.7148, pQ: 0.4328, pS: 0.2899, pF: 0.1307, pC: 0.0607 },
  MEX: { pG: 0.9218, pR: 0.6519, pQ: 0.4184, pS: 0.1941, pF: 0.0684, pC: 0.0253 },
  NED: { pG: 0.8722, pR: 0.598, pQ: 0.3839, pS: 0.1805, pF: 0.1034, pC: 0.046 },
  NOR: { pG: 0.2912, pR: 0.0719, pQ: 0.0119, pS: 0.0025, pF: 0.0011, pC: 0.0004 },
  NZL: { pG: 0.1532, pR: 0.1107, pQ: 0.0192, pS: 0.0034, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.281, pR: 0.0856, pQ: 0.0176, pS: 0.0032, pF: 0.0013, pC: 0.0002 },
  PAR: { pG: 0.3771, pR: 0.1473, pQ: 0.051, pS: 0.0201, pF: 0.0026, pC: 0.0005 },
  POR: { pG: 0.8618, pR: 0.4782, pQ: 0.2583, pS: 0.1001, pF: 0.0685, pC: 0.0338 },
  QAT: { pG: 0.417, pR: 0.186, pQ: 0.0622, pS: 0.0156, pF: 0.0019, pC: 0.0003 },
  RSA: { pG: 0.4342, pR: 0.2808, pQ: 0.0921, pS: 0.0258, pF: 0.0031, pC: 0.0004 },
  SCO: { pG: 0.623, pR: 0.4769, pQ: 0.2013, pS: 0.077, pF: 0.0107, pC: 0.0019 },
  SEN: { pG: 0.6605, pR: 0.2802, pQ: 0.0834, pS: 0.0338, pF: 0.0207, pC: 0.0079 },
  SUI: { pG: 0.8425, pR: 0.5091, pQ: 0.3062, pS: 0.1352, pF: 0.0459, pC: 0.014 },
  SWE: { pG: 0.3505, pR: 0.1612, pQ: 0.0557, pS: 0.0177, pF: 0.0027, pC: 0.001 },
  TUN: { pG: 0.2816, pR: 0.1228, pQ: 0.0367, pS: 0.0105, pF: 0.0011, pC: 0.0002 },
  TUR: { pG: 0.6101, pR: 0.2574, pQ: 0.1146, pS: 0.054, pF: 0.0125, pC: 0.0036 },
  URU: { pG: 0.8304, pR: 0.4388, pQ: 0.1494, pS: 0.0734, pF: 0.0325, pC: 0.0117 },
  USA: { pG: 0.7555, pR: 0.3608, pQ: 0.179, pS: 0.1028, pF: 0.0373, pC: 0.0124 },
  UZB: { pG: 0.187, pR: 0.0309, pQ: 0.0057, pS: 0.0005, pF: 0.0003, pC: 0.0 },
};
