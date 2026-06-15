// Auto-generated from M2 batch batch_20260615_221643Z on 2026-06-15T22:16:43Z.
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
  ALG: { pG: 0.4258, pR: 0.1011, pQ: 0.0178, pS: 0.0035, pF: 0.0017, pC: 0.0005 },
  ARG: { pG: 0.955, pR: 0.6721, pQ: 0.4041, pS: 0.2551, pF: 0.2031, pC: 0.1324 },
  AUS: { pG: 0.561, pR: 0.2345, pQ: 0.0967, pS: 0.0443, pF: 0.0107, pC: 0.0022 },
  AUT: { pG: 0.5064, pR: 0.1352, pQ: 0.028, pS: 0.009, pF: 0.0043, pC: 0.0012 },
  BEL: { pG: 0.9714, pR: 0.5648, pQ: 0.2824, pS: 0.1704, pF: 0.0827, pC: 0.0349 },
  BIH: { pG: 0.2694, pR: 0.1074, pQ: 0.0281, pS: 0.0063, pF: 0.0007, pC: 0.0001 },
  BRA: { pG: 0.9718, pR: 0.7141, pQ: 0.4411, pS: 0.3077, pF: 0.139, pC: 0.0681 },
  CAN: { pG: 0.6769, pR: 0.331, pQ: 0.1442, pS: 0.0457, pF: 0.0097, pC: 0.0028 },
  CIV: { pG: 0.764, pR: 0.4604, pQ: 0.1888, pS: 0.0751, pF: 0.0144, pC: 0.0025 },
  COD: { pG: 0.2092, pR: 0.0398, pQ: 0.0072, pS: 0.0005, pF: 0.0003, pC: 0.0001 },
  COL: { pG: 0.7471, pR: 0.3307, pQ: 0.1342, pS: 0.0383, pF: 0.0224, pC: 0.0086 },
  CPV: { pG: 0.1347, pR: 0.0577, pQ: 0.0141, pS: 0.0033, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7627, pR: 0.4071, pQ: 0.1697, pS: 0.0594, pF: 0.0375, pC: 0.0159 },
  CUW: { pG: 0.178, pR: 0.1193, pQ: 0.0236, pS: 0.0042, pF: 0.0001, pC: 0.0001 },
  CZE: { pG: 0.632, pR: 0.4128, pQ: 0.1649, pS: 0.0547, pF: 0.0088, pC: 0.0013 },
  ECU: { pG: 0.8714, pR: 0.496, pQ: 0.2231, pS: 0.096, pF: 0.0258, pC: 0.0074 },
  EGY: { pG: 0.8385, pR: 0.4767, pQ: 0.2057, pS: 0.094, pF: 0.0191, pC: 0.0043 },
  ENG: { pG: 0.9033, pR: 0.6293, pQ: 0.4123, pS: 0.2049, pF: 0.1549, pC: 0.0909 },
  ESP: { pG: 0.9775, pR: 0.7737, pQ: 0.5879, pS: 0.4236, pF: 0.3105, pC: 0.1878 },
  FRA: { pG: 0.9365, pR: 0.7103, pQ: 0.4472, pS: 0.2869, pF: 0.2294, pC: 0.1502 },
  GER: { pG: 0.9695, pR: 0.6331, pQ: 0.3876, pS: 0.1822, pF: 0.0904, pC: 0.0359 },
  GHA: { pG: 0.0511, pR: 0.0059, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1384, pR: 0.1085, pQ: 0.0237, pS: 0.0044, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8996, pR: 0.4922, pQ: 0.2221, pS: 0.1135, pF: 0.0299, pC: 0.0094 },
  IRQ: { pG: 0.1208, pR: 0.0178, pQ: 0.002, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1128, pR: 0.0119, pQ: 0.0003, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7067, pR: 0.3992, pQ: 0.1897, pS: 0.0751, pF: 0.032, pC: 0.0122 },
  KOR: { pG: 0.8045, pR: 0.5293, pQ: 0.2612, pS: 0.1038, pF: 0.0272, pC: 0.0074 },
  KSA: { pG: 0.2131, pR: 0.0937, pQ: 0.0248, pS: 0.0076, pF: 0.0004, pC: 0.0 },
  MAR: { pG: 0.9705, pR: 0.7023, pQ: 0.4261, pS: 0.2885, pF: 0.1321, pC: 0.0603 },
  MEX: { pG: 0.9205, pR: 0.6575, pQ: 0.4261, pS: 0.209, pF: 0.0745, pC: 0.0288 },
  NED: { pG: 0.8737, pR: 0.5999, pQ: 0.3807, pS: 0.1749, pF: 0.0977, pC: 0.0443 },
  NOR: { pG: 0.2795, pR: 0.0711, pQ: 0.0133, pS: 0.0023, pF: 0.0013, pC: 0.0005 },
  NZL: { pG: 0.1487, pR: 0.1043, pQ: 0.02, pS: 0.0039, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2829, pR: 0.0841, pQ: 0.0179, pS: 0.0027, pF: 0.001, pC: 0.0001 },
  PAR: { pG: 0.3609, pR: 0.138, pQ: 0.0475, pS: 0.0166, pF: 0.0026, pC: 0.0006 },
  POR: { pG: 0.8543, pR: 0.4685, pQ: 0.2529, pS: 0.1024, pF: 0.0707, pC: 0.0366 },
  QAT: { pG: 0.4227, pR: 0.1828, pQ: 0.0614, pS: 0.0135, pF: 0.0014, pC: 0.0002 },
  RSA: { pG: 0.4264, pR: 0.2748, pQ: 0.0859, pS: 0.0215, pF: 0.0022, pC: 0.0003 },
  SCO: { pG: 0.6297, pR: 0.4836, pQ: 0.2059, pS: 0.0786, pF: 0.0101, pC: 0.0026 },
  SEN: { pG: 0.6632, pR: 0.2805, pQ: 0.0873, pS: 0.0343, pF: 0.0213, pC: 0.0085 },
  SUI: { pG: 0.8476, pR: 0.5044, pQ: 0.2947, pS: 0.1272, pF: 0.0441, pC: 0.0134 },
  SWE: { pG: 0.3472, pR: 0.1584, pQ: 0.0566, pS: 0.0167, pF: 0.0029, pC: 0.0007 },
  TUN: { pG: 0.2895, pR: 0.1337, pQ: 0.0423, pS: 0.0122, pF: 0.0011, pC: 0.0003 },
  TUR: { pG: 0.5986, pR: 0.2534, pQ: 0.1113, pS: 0.0545, pF: 0.0137, pC: 0.0034 },
  URU: { pG: 0.8165, pR: 0.4369, pQ: 0.1506, pS: 0.0715, pF: 0.0325, pC: 0.0113 },
  USA: { pG: 0.7691, pR: 0.3656, pQ: 0.1812, pS: 0.0995, pF: 0.0353, pC: 0.0119 },
  UZB: { pG: 0.1894, pR: 0.0346, pQ: 0.0056, pS: 0.0005, pF: 0.0002, pC: 0.0 },
};
