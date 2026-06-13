// Auto-generated from M2 batch batch_20260613_230145Z on 2026-06-13T23:01:45Z.
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
  ALG: { pG: 0.4206, pR: 0.1005, pQ: 0.0197, pS: 0.0056, pF: 0.0023, pC: 0.0008 },
  ARG: { pG: 0.9525, pR: 0.6791, pQ: 0.4273, pS: 0.272, pF: 0.2208, pC: 0.1445 },
  AUS: { pG: 0.5583, pR: 0.2296, pQ: 0.0967, pS: 0.0441, pF: 0.0093, pC: 0.0022 },
  AUT: { pG: 0.5181, pR: 0.148, pQ: 0.0286, pS: 0.0089, pF: 0.0042, pC: 0.0013 },
  BEL: { pG: 0.9707, pR: 0.5582, pQ: 0.2733, pS: 0.1628, pF: 0.0797, pC: 0.0345 },
  BIH: { pG: 0.2688, pR: 0.1082, pQ: 0.0287, pS: 0.0054, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.9726, pR: 0.7134, pQ: 0.4354, pS: 0.2975, pF: 0.1323, pC: 0.0638 },
  CAN: { pG: 0.6808, pR: 0.333, pQ: 0.1482, pS: 0.0487, pF: 0.0107, pC: 0.0022 },
  CIV: { pG: 0.7695, pR: 0.463, pQ: 0.1927, pS: 0.079, pF: 0.0145, pC: 0.0029 },
  COD: { pG: 0.2107, pR: 0.0381, pQ: 0.0059, pS: 0.001, pF: 0.0004, pC: 0.0001 },
  COL: { pG: 0.7461, pR: 0.3329, pQ: 0.1391, pS: 0.0439, pF: 0.0253, pC: 0.0105 },
  CPV: { pG: 0.1326, pR: 0.0573, pQ: 0.0124, pS: 0.0033, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7622, pR: 0.4088, pQ: 0.1686, pS: 0.0603, pF: 0.0383, pC: 0.0163 },
  CUW: { pG: 0.1803, pR: 0.1235, pQ: 0.0261, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6241, pR: 0.4074, pQ: 0.1576, pS: 0.052, pF: 0.007, pC: 0.0014 },
  ECU: { pG: 0.8704, pR: 0.4972, pQ: 0.2165, pS: 0.0892, pF: 0.0224, pC: 0.0068 },
  EGY: { pG: 0.8235, pR: 0.4691, pQ: 0.2103, pS: 0.102, pF: 0.0191, pC: 0.0046 },
  ENG: { pG: 0.9076, pR: 0.631, pQ: 0.4146, pS: 0.1983, pF: 0.1514, pC: 0.0884 },
  ESP: { pG: 0.9789, pR: 0.7819, pQ: 0.5969, pS: 0.4325, pF: 0.3147, pC: 0.1911 },
  FRA: { pG: 0.9296, pR: 0.6882, pQ: 0.4236, pS: 0.2744, pF: 0.221, pC: 0.1428 },
  GER: { pG: 0.9701, pR: 0.6285, pQ: 0.3874, pS: 0.1845, pF: 0.0964, pC: 0.038 },
  GHA: { pG: 0.0503, pR: 0.0066, pQ: 0.0005, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1339, pR: 0.1083, pQ: 0.0253, pS: 0.0044, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8948, pR: 0.4764, pQ: 0.2204, pS: 0.1091, pF: 0.0297, pC: 0.0083 },
  IRQ: { pG: 0.1207, pR: 0.0199, pQ: 0.0021, pS: 0.0002, pF: 0.0001, pC: 0.0001 },
  JOR: { pG: 0.1088, pR: 0.0117, pQ: 0.0007, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7156, pR: 0.404, pQ: 0.1876, pS: 0.0709, pF: 0.0312, pC: 0.0117 },
  KOR: { pG: 0.8055, pR: 0.5287, pQ: 0.2679, pS: 0.1054, pF: 0.0243, pC: 0.0055 },
  KSA: { pG: 0.2115, pR: 0.0952, pQ: 0.0254, pS: 0.0077, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9731, pR: 0.7072, pQ: 0.4243, pS: 0.2932, pF: 0.1292, pC: 0.0595 },
  MEX: { pG: 0.9227, pR: 0.6531, pQ: 0.4175, pS: 0.1998, pF: 0.0723, pC: 0.0265 },
  NED: { pG: 0.8714, pR: 0.6002, pQ: 0.3853, pS: 0.18, pF: 0.1047, pC: 0.0474 },
  NOR: { pG: 0.2776, pR: 0.068, pQ: 0.0113, pS: 0.0027, pF: 0.0013, pC: 0.0002 },
  NZL: { pG: 0.1567, pR: 0.1077, pQ: 0.0229, pS: 0.0031, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2799, pR: 0.0807, pQ: 0.0199, pS: 0.0034, pF: 0.0013, pC: 0.0001 },
  PAR: { pG: 0.3633, pR: 0.1375, pQ: 0.0508, pS: 0.0175, pF: 0.0021, pC: 0.0006 },
  POR: { pG: 0.8569, pR: 0.4697, pQ: 0.2455, pS: 0.0943, pF: 0.0687, pC: 0.0346 },
  QAT: { pG: 0.4197, pR: 0.1759, pQ: 0.0574, pS: 0.0143, pF: 0.0018, pC: 0.0002 },
  RSA: { pG: 0.4319, pR: 0.2808, pQ: 0.0918, pS: 0.0261, pF: 0.0025, pC: 0.0006 },
  SCO: { pG: 0.629, pR: 0.4843, pQ: 0.2039, pS: 0.077, pF: 0.0106, pC: 0.0014 },
  SEN: { pG: 0.6721, pR: 0.2846, pQ: 0.0867, pS: 0.0342, pF: 0.0206, pC: 0.0096 },
  SUI: { pG: 0.8465, pR: 0.5129, pQ: 0.2988, pS: 0.1243, pF: 0.0406, pC: 0.0126 },
  SWE: { pG: 0.3507, pR: 0.1635, pQ: 0.0535, pS: 0.0188, pF: 0.0039, pC: 0.0013 },
  TUN: { pG: 0.272, pR: 0.1201, pQ: 0.0375, pS: 0.011, pF: 0.0017, pC: 0.0003 },
  TUR: { pG: 0.6068, pR: 0.2532, pQ: 0.1096, pS: 0.0547, pF: 0.0137, pC: 0.0058 },
  URU: { pG: 0.8313, pR: 0.4542, pQ: 0.1518, pS: 0.0708, pF: 0.0318, pC: 0.0099 },
  USA: { pG: 0.763, pR: 0.3665, pQ: 0.1861, pS: 0.1067, pF: 0.0364, pC: 0.0115 },
  UZB: { pG: 0.1863, pR: 0.0322, pQ: 0.0059, pS: 0.0006, pF: 0.0002, pC: 0.0 },
};
