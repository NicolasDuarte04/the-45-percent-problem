// Auto-generated from M2 batch batch_20260613_171952Z on 2026-06-13T17:19:52Z.
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
  ALG: { pG: 0.4268, pR: 0.1064, pQ: 0.0195, pS: 0.0039, pF: 0.0012, pC: 0.0003 },
  ARG: { pG: 0.9469, pR: 0.6689, pQ: 0.415, pS: 0.2637, pF: 0.2136, pC: 0.1374 },
  AUS: { pG: 0.5527, pR: 0.2231, pQ: 0.0932, pS: 0.0474, pF: 0.0117, pC: 0.0026 },
  AUT: { pG: 0.5111, pR: 0.1358, pQ: 0.0278, pS: 0.0092, pF: 0.0044, pC: 0.0014 },
  BEL: { pG: 0.9744, pR: 0.559, pQ: 0.2772, pS: 0.1677, pF: 0.0828, pC: 0.0396 },
  BIH: { pG: 0.2796, pR: 0.1121, pQ: 0.0297, pS: 0.0066, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9728, pR: 0.7034, pQ: 0.4321, pS: 0.296, pF: 0.1362, pC: 0.0646 },
  CAN: { pG: 0.6791, pR: 0.3406, pQ: 0.1456, pS: 0.0452, pF: 0.0111, pC: 0.0028 },
  CIV: { pG: 0.7743, pR: 0.4771, pQ: 0.1988, pS: 0.0776, pF: 0.0126, pC: 0.0023 },
  COD: { pG: 0.2034, pR: 0.0383, pQ: 0.0071, pS: 0.001, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7547, pR: 0.3285, pQ: 0.1335, pS: 0.0394, pF: 0.0237, pC: 0.0095 },
  CPV: { pG: 0.1347, pR: 0.0608, pQ: 0.0141, pS: 0.0032, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7658, pR: 0.4111, pQ: 0.1759, pS: 0.0608, pF: 0.0385, pC: 0.0162 },
  CUW: { pG: 0.1723, pR: 0.1149, pQ: 0.022, pS: 0.0042, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6253, pR: 0.406, pQ: 0.1584, pS: 0.0535, pF: 0.0068, pC: 0.0015 },
  ECU: { pG: 0.872, pR: 0.4938, pQ: 0.2158, pS: 0.0924, pF: 0.0202, pC: 0.0055 },
  EGY: { pG: 0.826, pR: 0.4739, pQ: 0.2083, pS: 0.101, pF: 0.0212, pC: 0.0057 },
  ENG: { pG: 0.9068, pR: 0.6199, pQ: 0.4059, pS: 0.1956, pF: 0.1479, pC: 0.0851 },
  ESP: { pG: 0.9768, pR: 0.7805, pQ: 0.5938, pS: 0.4333, pF: 0.3113, pC: 0.1875 },
  FRA: { pG: 0.9338, pR: 0.7062, pQ: 0.4397, pS: 0.2827, pF: 0.2273, pC: 0.1437 },
  GER: { pG: 0.9741, pR: 0.6293, pQ: 0.3896, pS: 0.1761, pF: 0.0895, pC: 0.0372 },
  GHA: { pG: 0.0474, pR: 0.0061, pQ: 0.0009, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.136, pR: 0.1083, pQ: 0.025, pS: 0.0049, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8969, pR: 0.4691, pQ: 0.2194, pS: 0.1081, pF: 0.0277, pC: 0.0074 },
  IRQ: { pG: 0.1171, pR: 0.0184, pQ: 0.0016, pS: 0.0003, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.1152, pR: 0.0115, pQ: 0.001, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7105, pR: 0.4011, pQ: 0.1877, pS: 0.0713, pF: 0.0267, pC: 0.0105 },
  KOR: { pG: 0.805, pR: 0.5254, pQ: 0.2515, pS: 0.1, pF: 0.0242, pC: 0.0066 },
  KSA: { pG: 0.2184, pR: 0.0996, pQ: 0.0273, pS: 0.0082, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9707, pR: 0.7057, pQ: 0.4304, pS: 0.2932, pF: 0.1392, pC: 0.066 },
  MEX: { pG: 0.9225, pR: 0.6482, pQ: 0.4173, pS: 0.1936, pF: 0.0728, pC: 0.0294 },
  NED: { pG: 0.8689, pR: 0.5969, pQ: 0.3884, pS: 0.179, pF: 0.1026, pC: 0.0476 },
  NOR: { pG: 0.2726, pR: 0.0621, pQ: 0.0092, pS: 0.002, pF: 0.0007, pC: 0.0003 },
  NZL: { pG: 0.1479, pR: 0.1042, pQ: 0.018, pS: 0.0033, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.28, pR: 0.0846, pQ: 0.0159, pS: 0.0036, pF: 0.0013, pC: 0.0005 },
  PAR: { pG: 0.3668, pR: 0.1487, pQ: 0.0533, pS: 0.0204, pF: 0.0034, pC: 0.0003 },
  POR: { pG: 0.8599, pR: 0.4776, pQ: 0.2543, pS: 0.1007, pF: 0.0674, pC: 0.0338 },
  QAT: { pG: 0.4233, pR: 0.1823, pQ: 0.0571, pS: 0.0128, pF: 0.002, pC: 0.0001 },
  RSA: { pG: 0.4249, pR: 0.2762, pQ: 0.0855, pS: 0.0241, pF: 0.0025, pC: 0.0002 },
  SCO: { pG: 0.6288, pR: 0.4814, pQ: 0.2183, pS: 0.0825, pF: 0.0113, pC: 0.0018 },
  SEN: { pG: 0.6765, pR: 0.2907, pQ: 0.0862, pS: 0.0364, pF: 0.0247, pC: 0.0096 },
  SUI: { pG: 0.8403, pR: 0.5092, pQ: 0.3019, pS: 0.1291, pF: 0.0457, pC: 0.0149 },
  SWE: { pG: 0.3509, pR: 0.163, pQ: 0.056, pS: 0.0195, pF: 0.0022, pC: 0.0003 },
  TUN: { pG: 0.277, pR: 0.1239, pQ: 0.037, pS: 0.0115, pF: 0.0015, pC: 0.0001 },
  TUR: { pG: 0.6053, pR: 0.2612, pQ: 0.1129, pS: 0.0561, pF: 0.0137, pC: 0.004 },
  URU: { pG: 0.8249, pR: 0.4529, pQ: 0.1466, pS: 0.0707, pF: 0.0303, pC: 0.0116 },
  USA: { pG: 0.7669, pR: 0.3682, pQ: 0.1878, pS: 0.1075, pF: 0.0381, pC: 0.012 },
  UZB: { pG: 0.182, pR: 0.0339, pQ: 0.0065, pS: 0.0005, pF: 0.0002, pC: 0.0001 },
};
