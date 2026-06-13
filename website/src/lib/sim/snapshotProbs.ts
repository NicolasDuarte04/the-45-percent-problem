// Auto-generated from M2 batch batch_20260613_154155Z on 2026-06-13T15:41:55Z.
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
  ALG: { pG: 0.4254, pR: 0.1065, pQ: 0.0199, pS: 0.0047, pF: 0.003, pC: 0.0008 },
  ARG: { pG: 0.9516, pR: 0.6721, pQ: 0.4126, pS: 0.2707, pF: 0.2189, pC: 0.143 },
  AUS: { pG: 0.5583, pR: 0.2317, pQ: 0.101, pS: 0.0455, pF: 0.0101, pC: 0.0024 },
  AUT: { pG: 0.5108, pR: 0.1401, pQ: 0.0274, pS: 0.0074, pF: 0.0033, pC: 0.0007 },
  BEL: { pG: 0.9715, pR: 0.5648, pQ: 0.2828, pS: 0.1647, pF: 0.0793, pC: 0.0334 },
  BIH: { pG: 0.2614, pR: 0.1028, pQ: 0.0259, pS: 0.005, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9731, pR: 0.7139, pQ: 0.4377, pS: 0.2993, pF: 0.1408, pC: 0.0658 },
  CAN: { pG: 0.682, pR: 0.3442, pQ: 0.1466, pS: 0.0472, pF: 0.0109, pC: 0.0032 },
  CIV: { pG: 0.7714, pR: 0.47, pQ: 0.1927, pS: 0.0752, pF: 0.0133, pC: 0.0022 },
  COD: { pG: 0.2029, pR: 0.0371, pQ: 0.0066, pS: 0.0006, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7499, pR: 0.3356, pQ: 0.1375, pS: 0.0403, pF: 0.0245, pC: 0.0091 },
  CPV: { pG: 0.1302, pR: 0.0573, pQ: 0.0132, pS: 0.0037, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.758, pR: 0.403, pQ: 0.1721, pS: 0.0627, pF: 0.0394, pC: 0.0169 },
  CUW: { pG: 0.1805, pR: 0.1236, pQ: 0.0205, pS: 0.0035, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6273, pR: 0.4162, pQ: 0.1627, pS: 0.0556, pF: 0.0066, pC: 0.0016 },
  ECU: { pG: 0.8685, pR: 0.4995, pQ: 0.2253, pS: 0.0934, pF: 0.0265, pC: 0.0065 },
  EGY: { pG: 0.829, pR: 0.4776, pQ: 0.2113, pS: 0.1005, pF: 0.0204, pC: 0.0053 },
  ENG: { pG: 0.9104, pR: 0.6318, pQ: 0.408, pS: 0.1929, pF: 0.1456, pC: 0.0833 },
  ESP: { pG: 0.9793, pR: 0.7754, pQ: 0.59, pS: 0.4262, pF: 0.3069, pC: 0.1913 },
  FRA: { pG: 0.9333, pR: 0.7057, pQ: 0.4405, pS: 0.2815, pF: 0.2261, pC: 0.1476 },
  GER: { pG: 0.97, pR: 0.6271, pQ: 0.386, pS: 0.1811, pF: 0.0929, pC: 0.04 },
  GHA: { pG: 0.049, pR: 0.0048, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1323, pR: 0.1032, pQ: 0.0212, pS: 0.0029, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8953, pR: 0.4752, pQ: 0.2195, pS: 0.1073, pF: 0.0306, pC: 0.0094 },
  IRQ: { pG: 0.1233, pR: 0.0187, pQ: 0.0023, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1122, pR: 0.0103, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7058, pR: 0.4035, pQ: 0.1888, pS: 0.0713, pF: 0.03, pC: 0.0085 },
  KOR: { pG: 0.8107, pR: 0.5216, pQ: 0.2594, pS: 0.105, pF: 0.0218, pC: 0.0061 },
  KSA: { pG: 0.2193, pR: 0.099, pQ: 0.0276, pS: 0.0083, pF: 0.0009, pC: 0.0002 },
  MAR: { pG: 0.9704, pR: 0.7056, pQ: 0.4293, pS: 0.289, pF: 0.1306, pC: 0.0607 },
  MEX: { pG: 0.9125, pR: 0.6447, pQ: 0.4132, pS: 0.197, pF: 0.0717, pC: 0.0266 },
  NED: { pG: 0.8677, pR: 0.5844, pQ: 0.3781, pS: 0.1801, pF: 0.1041, pC: 0.047 },
  NOR: { pG: 0.2866, pR: 0.0733, pQ: 0.0123, pS: 0.0032, pF: 0.0015, pC: 0.0001 },
  NZL: { pG: 0.1505, pR: 0.107, pQ: 0.0211, pS: 0.0038, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2826, pR: 0.0836, pQ: 0.0189, pS: 0.0042, pF: 0.0021, pC: 0.0007 },
  PAR: { pG: 0.37, pR: 0.1387, pQ: 0.0506, pS: 0.0195, pF: 0.0032, pC: 0.0005 },
  POR: { pG: 0.8578, pR: 0.4679, pQ: 0.2503, pS: 0.099, pF: 0.0703, pC: 0.0338 },
  QAT: { pG: 0.4288, pR: 0.1873, pQ: 0.0603, pS: 0.0155, pF: 0.0018, pC: 0.0002 },
  RSA: { pG: 0.4316, pR: 0.2734, pQ: 0.0909, pS: 0.0246, pF: 0.0027, pC: 0.0005 },
  SCO: { pG: 0.6263, pR: 0.4819, pQ: 0.2071, pS: 0.0832, pF: 0.0112, pC: 0.0024 },
  SEN: { pG: 0.6568, pR: 0.2733, pQ: 0.0844, pS: 0.0318, pF: 0.0186, pC: 0.0077 },
  SUI: { pG: 0.8457, pR: 0.5098, pQ: 0.3032, pS: 0.1325, pF: 0.0439, pC: 0.0151 },
  SWE: { pG: 0.3553, pR: 0.1661, pQ: 0.0568, pS: 0.0199, pF: 0.0037, pC: 0.0009 },
  TUN: { pG: 0.2808, pR: 0.1258, pQ: 0.0401, pS: 0.0119, pF: 0.0018, pC: 0.0003 },
  TUR: { pG: 0.5983, pR: 0.2544, pQ: 0.1081, pS: 0.0524, pF: 0.0125, pC: 0.0031 },
  URU: { pG: 0.8249, pR: 0.4437, pQ: 0.1462, pS: 0.0719, pF: 0.0312, pC: 0.0104 },
  USA: { pG: 0.7713, pR: 0.3706, pQ: 0.1828, pS: 0.103, pF: 0.0365, pC: 0.0127 },
  UZB: { pG: 0.1894, pR: 0.0362, pQ: 0.0062, pS: 0.0008, pF: 0.0003, pC: 0.0 },
};
