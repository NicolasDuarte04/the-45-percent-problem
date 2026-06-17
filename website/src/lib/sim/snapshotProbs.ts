// Auto-generated from M2 batch batch_20260617_192354Z on 2026-06-17T19:23:54Z.
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
  ALG: { pG: 0.4308, pR: 0.1018, pQ: 0.0189, pS: 0.0045, pF: 0.0015, pC: 0.0006 },
  ARG: { pG: 0.9568, pR: 0.6774, pQ: 0.4139, pS: 0.2718, pF: 0.2193, pC: 0.1413 },
  AUS: { pG: 0.5608, pR: 0.2365, pQ: 0.1004, pS: 0.0485, pF: 0.01, pC: 0.003 },
  AUT: { pG: 0.503, pR: 0.1434, pQ: 0.029, pS: 0.0077, pF: 0.003, pC: 0.0009 },
  BEL: { pG: 0.9731, pR: 0.5584, pQ: 0.2773, pS: 0.1631, pF: 0.0811, pC: 0.0326 },
  BIH: { pG: 0.2776, pR: 0.1107, pQ: 0.0292, pS: 0.006, pF: 0.0007, pC: 0.0 },
  BRA: { pG: 0.9749, pR: 0.7139, pQ: 0.4324, pS: 0.2963, pF: 0.1396, pC: 0.0622 },
  CAN: { pG: 0.684, pR: 0.3404, pQ: 0.1463, pS: 0.0492, pF: 0.0096, pC: 0.002 },
  CIV: { pG: 0.7705, pR: 0.4672, pQ: 0.1936, pS: 0.0761, pF: 0.0135, pC: 0.0027 },
  COD: { pG: 0.2072, pR: 0.0367, pQ: 0.007, pS: 0.0002, pF: 0.0, pC: 0.0 },
  COL: { pG: 0.7435, pR: 0.3233, pQ: 0.1274, pS: 0.04, pF: 0.0244, pC: 0.0093 },
  CPV: { pG: 0.1349, pR: 0.058, pQ: 0.0105, pS: 0.0026, pF: 0.0004, pC: 0.0 },
  CRO: { pG: 0.7547, pR: 0.4065, pQ: 0.1641, pS: 0.0541, pF: 0.0355, pC: 0.0162 },
  CUW: { pG: 0.1739, pR: 0.1171, pQ: 0.0248, pS: 0.0043, pF: 0.0003, pC: 0.0001 },
  CZE: { pG: 0.6236, pR: 0.4085, pQ: 0.1584, pS: 0.0556, pF: 0.0069, pC: 0.0017 },
  ECU: { pG: 0.8702, pR: 0.4978, pQ: 0.223, pS: 0.0937, pF: 0.024, pC: 0.0079 },
  EGY: { pG: 0.8256, pR: 0.4727, pQ: 0.216, pS: 0.1001, pF: 0.0213, pC: 0.0056 },
  ENG: { pG: 0.9096, pR: 0.6319, pQ: 0.4163, pS: 0.1972, pF: 0.1502, pC: 0.0863 },
  ESP: { pG: 0.9784, pR: 0.7802, pQ: 0.5944, pS: 0.4269, pF: 0.3115, pC: 0.1924 },
  FRA: { pG: 0.9271, pR: 0.6956, pQ: 0.437, pS: 0.2816, pF: 0.2251, pC: 0.149 },
  GER: { pG: 0.973, pR: 0.6271, pQ: 0.3921, pS: 0.1796, pF: 0.0893, pC: 0.0397 },
  GHA: { pG: 0.0524, pR: 0.0057, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1326, pR: 0.1034, pQ: 0.0211, pS: 0.0027, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8976, pR: 0.4769, pQ: 0.2113, pS: 0.1069, pF: 0.0276, pC: 0.0089 },
  IRQ: { pG: 0.1199, pR: 0.019, pQ: 0.0019, pS: 0.0, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1094, pR: 0.0103, pQ: 0.001, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7178, pR: 0.4092, pQ: 0.1835, pS: 0.0717, pF: 0.0272, pC: 0.009 },
  KOR: { pG: 0.8106, pR: 0.5285, pQ: 0.255, pS: 0.1002, pF: 0.0258, pC: 0.0069 },
  KSA: { pG: 0.2128, pR: 0.0953, pQ: 0.0257, pS: 0.0074, pF: 0.0011, pC: 0.0001 },
  MAR: { pG: 0.9721, pR: 0.706, pQ: 0.4327, pS: 0.2955, pF: 0.137, pC: 0.064 },
  MEX: { pG: 0.9194, pR: 0.6525, pQ: 0.4202, pS: 0.2009, pF: 0.0702, pC: 0.0239 },
  NED: { pG: 0.8628, pR: 0.5904, pQ: 0.3857, pS: 0.1802, pF: 0.1001, pC: 0.045 },
  NOR: { pG: 0.2791, pR: 0.0695, pQ: 0.0115, pS: 0.0026, pF: 0.0012, pC: 0.0002 },
  NZL: { pG: 0.1559, pR: 0.1121, pQ: 0.0223, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2833, pR: 0.0877, pQ: 0.0168, pS: 0.0021, pF: 0.0008, pC: 0.0002 },
  PAR: { pG: 0.3626, pR: 0.1375, pQ: 0.0488, pS: 0.0177, pF: 0.0035, pC: 0.0005 },
  POR: { pG: 0.8617, pR: 0.4733, pQ: 0.2631, pS: 0.1025, pF: 0.0708, pC: 0.0346 },
  QAT: { pG: 0.4194, pR: 0.1798, pQ: 0.0589, pS: 0.0134, pF: 0.0022, pC: 0.0 },
  RSA: { pG: 0.4218, pR: 0.2746, pQ: 0.0937, pS: 0.0244, pF: 0.0025, pC: 0.0004 },
  SCO: { pG: 0.6326, pR: 0.4847, pQ: 0.2082, pS: 0.0815, pF: 0.0111, pC: 0.0021 },
  SEN: { pG: 0.6739, pR: 0.283, pQ: 0.0868, pS: 0.0353, pF: 0.0194, pC: 0.0084 },
  SUI: { pG: 0.8436, pR: 0.505, pQ: 0.2991, pS: 0.1291, pF: 0.0423, pC: 0.0148 },
  SWE: { pG: 0.3496, pR: 0.1621, pQ: 0.0548, pS: 0.0174, pF: 0.0027, pC: 0.0003 },
  TUN: { pG: 0.2822, pR: 0.1291, pQ: 0.039, pS: 0.0121, pF: 0.002, pC: 0.0002 },
  TUR: { pG: 0.6085, pR: 0.2592, pQ: 0.1132, pS: 0.0575, pF: 0.0157, pC: 0.0046 },
  URU: { pG: 0.8217, pR: 0.4464, pQ: 0.146, pS: 0.0703, pF: 0.0317, pC: 0.0107 },
  USA: { pG: 0.7559, pR: 0.3588, pQ: 0.1824, pS: 0.106, pF: 0.0376, pC: 0.0117 },
  UZB: { pG: 0.1876, pR: 0.0349, pQ: 0.0049, pS: 0.0003, pF: 0.0001, pC: 0.0 },
};
