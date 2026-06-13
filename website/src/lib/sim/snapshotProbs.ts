// Auto-generated from M2 batch batch_20260613_065919Z on 2026-06-13T06:59:19Z.
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
  ALG: { pG: 0.4206, pR: 0.103, pQ: 0.0181, pS: 0.0051, pF: 0.0032, pC: 0.0005 },
  ARG: { pG: 0.9512, pR: 0.68, pQ: 0.4235, pS: 0.2741, pF: 0.2246, pC: 0.1441 },
  AUS: { pG: 0.5625, pR: 0.2306, pQ: 0.0954, pS: 0.0451, pF: 0.0102, pC: 0.0027 },
  AUT: { pG: 0.5163, pR: 0.1403, pQ: 0.0285, pS: 0.0087, pF: 0.0049, pC: 0.0013 },
  BEL: { pG: 0.9701, pR: 0.5651, pQ: 0.2908, pS: 0.1665, pF: 0.0823, pC: 0.0332 },
  BIH: { pG: 0.2631, pR: 0.0996, pQ: 0.0248, pS: 0.0045, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9736, pR: 0.7036, pQ: 0.4351, pS: 0.2995, pF: 0.1407, pC: 0.066 },
  CAN: { pG: 0.6833, pR: 0.3426, pQ: 0.153, pS: 0.0525, pF: 0.012, pC: 0.0029 },
  CIV: { pG: 0.7649, pR: 0.4637, pQ: 0.1902, pS: 0.0784, pF: 0.013, pC: 0.0021 },
  COD: { pG: 0.2076, pR: 0.0386, pQ: 0.0062, pS: 0.0005, pF: 0.0, pC: 0.0 },
  COL: { pG: 0.7515, pR: 0.338, pQ: 0.1409, pS: 0.0442, pF: 0.0259, pC: 0.0119 },
  CPV: { pG: 0.1379, pR: 0.0608, pQ: 0.0151, pS: 0.0029, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7634, pR: 0.4061, pQ: 0.1725, pS: 0.0592, pF: 0.0382, pC: 0.0177 },
  CUW: { pG: 0.1857, pR: 0.1232, pQ: 0.027, pS: 0.0041, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6167, pR: 0.4032, pQ: 0.1554, pS: 0.0547, pF: 0.0071, pC: 0.0011 },
  ECU: { pG: 0.8656, pR: 0.4935, pQ: 0.2212, pS: 0.0937, pF: 0.0239, pC: 0.0075 },
  EGY: { pG: 0.8272, pR: 0.4767, pQ: 0.2022, pS: 0.0951, pF: 0.0199, pC: 0.0051 },
  ENG: { pG: 0.9065, pR: 0.6178, pQ: 0.4069, pS: 0.1961, pF: 0.148, pC: 0.0872 },
  ESP: { pG: 0.9767, pR: 0.7801, pQ: 0.5901, pS: 0.4283, pF: 0.3103, pC: 0.1908 },
  FRA: { pG: 0.9341, pR: 0.7043, pQ: 0.4261, pS: 0.2734, pF: 0.2153, pC: 0.1387 },
  GER: { pG: 0.9735, pR: 0.6174, pQ: 0.3799, pS: 0.1787, pF: 0.0859, pC: 0.0348 },
  GHA: { pG: 0.0528, pR: 0.006, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1349, pR: 0.1072, pQ: 0.0245, pS: 0.0043, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8933, pR: 0.4763, pQ: 0.2134, pS: 0.1096, pF: 0.0282, pC: 0.0082 },
  IRQ: { pG: 0.1269, pR: 0.0209, pQ: 0.002, pS: 0.0004, pF: 0.0004, pC: 0.0 },
  JOR: { pG: 0.1119, pR: 0.0116, pQ: 0.0007, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7241, pR: 0.4081, pQ: 0.1882, pS: 0.0695, pF: 0.0303, pC: 0.011 },
  KOR: { pG: 0.8093, pR: 0.5263, pQ: 0.257, pS: 0.1034, pF: 0.0244, pC: 0.0065 },
  KSA: { pG: 0.2175, pR: 0.0924, pQ: 0.0258, pS: 0.0079, pF: 0.0003, pC: 0.0 },
  MAR: { pG: 0.9705, pR: 0.7061, pQ: 0.4259, pS: 0.2875, pF: 0.1315, pC: 0.0613 },
  MEX: { pG: 0.9216, pR: 0.6549, pQ: 0.4269, pS: 0.2061, pF: 0.0748, pC: 0.0299 },
  NED: { pG: 0.8716, pR: 0.6064, pQ: 0.3932, pS: 0.1847, pF: 0.1069, pC: 0.0506 },
  NOR: { pG: 0.2857, pR: 0.0643, pQ: 0.0122, pS: 0.0022, pF: 0.0011, pC: 0.0004 },
  NZL: { pG: 0.155, pR: 0.1111, pQ: 0.0221, pS: 0.0042, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2773, pR: 0.0871, pQ: 0.0201, pS: 0.0031, pF: 0.0018, pC: 0.0007 },
  PAR: { pG: 0.3743, pR: 0.1479, pQ: 0.0555, pS: 0.0202, pF: 0.0041, pC: 0.0006 },
  POR: { pG: 0.8581, pR: 0.4702, pQ: 0.2467, pS: 0.0945, pF: 0.0627, pC: 0.0311 },
  QAT: { pG: 0.4294, pR: 0.1807, pQ: 0.0596, pS: 0.0152, pF: 0.0019, pC: 0.0005 },
  RSA: { pG: 0.4319, pR: 0.2833, pQ: 0.0913, pS: 0.0251, pF: 0.0034, pC: 0.0008 },
  SCO: { pG: 0.6251, pR: 0.4769, pQ: 0.1993, pS: 0.0757, pF: 0.0122, pC: 0.0024 },
  SEN: { pG: 0.6533, pR: 0.2756, pQ: 0.0889, pS: 0.0371, pF: 0.023, pC: 0.0088 },
  SUI: { pG: 0.8447, pR: 0.5094, pQ: 0.2998, pS: 0.1253, pF: 0.0397, pC: 0.0112 },
  SWE: { pG: 0.3421, pR: 0.1649, pQ: 0.0562, pS: 0.0177, pF: 0.0032, pC: 0.0007 },
  TUN: { pG: 0.2725, pR: 0.1228, pQ: 0.038, pS: 0.0108, pF: 0.002, pC: 0.0003 },
  TUR: { pG: 0.6043, pR: 0.2627, pQ: 0.1139, pS: 0.0541, pF: 0.0141, pC: 0.0042 },
  URU: { pG: 0.8223, pR: 0.4375, pQ: 0.1466, pS: 0.0707, pF: 0.0308, pC: 0.0106 },
  USA: { pG: 0.7548, pR: 0.365, pQ: 0.1826, pS: 0.104, pF: 0.0365, pC: 0.0126 },
  UZB: { pG: 0.1828, pR: 0.0362, pQ: 0.0062, pS: 0.0012, pF: 0.0003, pC: 0.0 },
};
