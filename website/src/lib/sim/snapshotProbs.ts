// Auto-generated from M2 batch batch_20260618_162728Z on 2026-06-18T16:27:28Z.
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
  ALG: { pG: 0.432, pR: 0.0999, pQ: 0.0156, pS: 0.0037, pF: 0.0015, pC: 0.0006 },
  ARG: { pG: 0.9494, pR: 0.6791, pQ: 0.4198, pS: 0.2704, pF: 0.2178, pC: 0.1414 },
  AUS: { pG: 0.544, pR: 0.2243, pQ: 0.0954, pS: 0.0434, pF: 0.0109, pC: 0.0028 },
  AUT: { pG: 0.5095, pR: 0.1344, pQ: 0.0287, pS: 0.0076, pF: 0.0043, pC: 0.0013 },
  BEL: { pG: 0.9718, pR: 0.5708, pQ: 0.2792, pS: 0.1652, pF: 0.0833, pC: 0.0353 },
  BIH: { pG: 0.2651, pR: 0.1039, pQ: 0.0269, pS: 0.0051, pF: 0.0005, pC: 0.0001 },
  BRA: { pG: 0.9736, pR: 0.7221, pQ: 0.4401, pS: 0.3, pF: 0.1365, pC: 0.0636 },
  CAN: { pG: 0.6819, pR: 0.3437, pQ: 0.1502, pS: 0.0502, pF: 0.0099, pC: 0.0017 },
  CIV: { pG: 0.7704, pR: 0.4746, pQ: 0.1936, pS: 0.0785, pF: 0.0134, pC: 0.0034 },
  COD: { pG: 0.2048, pR: 0.0366, pQ: 0.0058, pS: 0.0008, pF: 0.0003, pC: 0.0 },
  COL: { pG: 0.7436, pR: 0.3298, pQ: 0.1356, pS: 0.0427, pF: 0.028, pC: 0.0101 },
  CPV: { pG: 0.1365, pR: 0.0585, pQ: 0.0119, pS: 0.0027, pF: 0.0004, pC: 0.0 },
  CRO: { pG: 0.7694, pR: 0.4094, pQ: 0.1712, pS: 0.0571, pF: 0.0372, pC: 0.0176 },
  CUW: { pG: 0.1745, pR: 0.1171, pQ: 0.022, pS: 0.0043, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6217, pR: 0.4037, pQ: 0.1554, pS: 0.0516, pF: 0.0068, pC: 0.0017 },
  ECU: { pG: 0.8713, pR: 0.4959, pQ: 0.2287, pS: 0.0991, pF: 0.027, pC: 0.0071 },
  EGY: { pG: 0.8309, pR: 0.4769, pQ: 0.2071, pS: 0.099, pF: 0.0183, pC: 0.0051 },
  ENG: { pG: 0.9104, pR: 0.6311, pQ: 0.4111, pS: 0.1949, pF: 0.1454, pC: 0.0823 },
  ESP: { pG: 0.9769, pR: 0.7806, pQ: 0.5955, pS: 0.4338, pF: 0.3165, pC: 0.1947 },
  FRA: { pG: 0.9339, pR: 0.7071, pQ: 0.4351, pS: 0.28, pF: 0.2223, pC: 0.1468 },
  GER: { pG: 0.9727, pR: 0.6278, pQ: 0.3907, pS: 0.1795, pF: 0.0918, pC: 0.0394 },
  GHA: { pG: 0.0525, pR: 0.0072, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1318, pR: 0.1048, pQ: 0.0211, pS: 0.0026, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8985, pR: 0.4693, pQ: 0.222, pS: 0.1166, pF: 0.0331, pC: 0.0111 },
  IRQ: { pG: 0.1179, pR: 0.0163, pQ: 0.0015, pS: 0.0004, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.1091, pR: 0.0102, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7198, pR: 0.412, pQ: 0.1904, pS: 0.0723, pF: 0.0296, pC: 0.0115 },
  KOR: { pG: 0.8086, pR: 0.5287, pQ: 0.2672, pS: 0.1082, pF: 0.0256, pC: 0.0056 },
  KSA: { pG: 0.2099, pR: 0.0913, pQ: 0.0252, pS: 0.0073, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9709, pR: 0.7103, pQ: 0.4293, pS: 0.2931, pF: 0.1311, pC: 0.0606 },
  MEX: { pG: 0.9219, pR: 0.6524, pQ: 0.4114, pS: 0.1969, pF: 0.071, pC: 0.0248 },
  NED: { pG: 0.8683, pR: 0.5936, pQ: 0.3787, pS: 0.1692, pF: 0.0968, pC: 0.0446 },
  NOR: { pG: 0.2767, pR: 0.0641, pQ: 0.0107, pS: 0.0025, pF: 0.0007, pC: 0.0002 },
  NZL: { pG: 0.1471, pR: 0.1062, pQ: 0.0201, pS: 0.0029, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2677, pR: 0.0754, pQ: 0.0172, pS: 0.0022, pF: 0.0007, pC: 0.0001 },
  PAR: { pG: 0.3728, pR: 0.1436, pQ: 0.0555, pS: 0.0214, pF: 0.0024, pC: 0.0005 },
  POR: { pG: 0.8634, pR: 0.478, pQ: 0.2536, pS: 0.1024, pF: 0.07, pC: 0.032 },
  QAT: { pG: 0.4209, pR: 0.1759, pQ: 0.0557, pS: 0.0155, pF: 0.0019, pC: 0.0002 },
  RSA: { pG: 0.4347, pR: 0.2788, pQ: 0.0914, pS: 0.0241, pF: 0.0028, pC: 0.0006 },
  SCO: { pG: 0.634, pR: 0.4836, pQ: 0.2069, pS: 0.0753, pF: 0.0122, pC: 0.0028 },
  SEN: { pG: 0.6715, pR: 0.2889, pQ: 0.0881, pS: 0.0349, pF: 0.021, pC: 0.0088 },
  SUI: { pG: 0.8452, pR: 0.5129, pQ: 0.3018, pS: 0.1254, pF: 0.043, pC: 0.0135 },
  SWE: { pG: 0.3414, pR: 0.1552, pQ: 0.0514, pS: 0.0171, pF: 0.004, pC: 0.0006 },
  TUN: { pG: 0.2816, pR: 0.1238, pQ: 0.0387, pS: 0.0124, pF: 0.0015, pC: 0.0005 },
  TUR: { pG: 0.6126, pR: 0.2531, pQ: 0.1097, pS: 0.0515, pF: 0.0138, pC: 0.0041 },
  URU: { pG: 0.8284, pR: 0.4464, pQ: 0.1448, pS: 0.0706, pF: 0.03, pC: 0.0111 },
  USA: { pG: 0.7603, pR: 0.3582, pQ: 0.182, pS: 0.1052, pF: 0.0357, pC: 0.0117 },
  UZB: { pG: 0.1882, pR: 0.0325, pQ: 0.0047, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
