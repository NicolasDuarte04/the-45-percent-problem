// Auto-generated from M2 batch batch_20260614_171729Z on 2026-06-14T17:17:29Z.
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
  ALG: { pG: 0.4269, pR: 0.1019, pQ: 0.018, pS: 0.0048, pF: 0.0022, pC: 0.0007 },
  ARG: { pG: 0.9528, pR: 0.6751, pQ: 0.4232, pS: 0.2709, pF: 0.2183, pC: 0.1396 },
  AUS: { pG: 0.5554, pR: 0.2267, pQ: 0.0964, pS: 0.0448, pF: 0.0107, pC: 0.0026 },
  AUT: { pG: 0.5109, pR: 0.1439, pQ: 0.0288, pS: 0.009, pF: 0.004, pC: 0.0017 },
  BEL: { pG: 0.9736, pR: 0.5711, pQ: 0.2918, pS: 0.1759, pF: 0.0863, pC: 0.0365 },
  BIH: { pG: 0.27, pR: 0.1068, pQ: 0.0289, pS: 0.0057, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9717, pR: 0.7202, pQ: 0.446, pS: 0.3086, pF: 0.1448, pC: 0.0664 },
  CAN: { pG: 0.682, pR: 0.342, pQ: 0.1511, pS: 0.0488, pF: 0.0117, pC: 0.0027 },
  CIV: { pG: 0.7727, pR: 0.4713, pQ: 0.1932, pS: 0.0773, pF: 0.0132, pC: 0.0032 },
  COD: { pG: 0.2131, pR: 0.0413, pQ: 0.0067, pS: 0.001, pF: 0.0005, pC: 0.0003 },
  COL: { pG: 0.7454, pR: 0.3303, pQ: 0.1344, pS: 0.045, pF: 0.0274, pC: 0.0119 },
  CPV: { pG: 0.1256, pR: 0.0565, pQ: 0.0126, pS: 0.0033, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.765, pR: 0.4106, pQ: 0.1695, pS: 0.055, pF: 0.0358, pC: 0.0154 },
  CUW: { pG: 0.1765, pR: 0.1185, pQ: 0.0246, pS: 0.0048, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6216, pR: 0.413, pQ: 0.1644, pS: 0.0535, pF: 0.0078, pC: 0.0017 },
  ECU: { pG: 0.8707, pR: 0.5031, pQ: 0.224, pS: 0.0945, pF: 0.0247, pC: 0.0073 },
  EGY: { pG: 0.8274, pR: 0.4729, pQ: 0.2129, pS: 0.0966, pF: 0.0198, pC: 0.0046 },
  ENG: { pG: 0.9077, pR: 0.6292, pQ: 0.4155, pS: 0.2014, pF: 0.1491, pC: 0.0876 },
  ESP: { pG: 0.9753, pR: 0.7816, pQ: 0.5902, pS: 0.4321, pF: 0.3173, pC: 0.194 },
  FRA: { pG: 0.932, pR: 0.6944, pQ: 0.433, pS: 0.2767, pF: 0.2259, pC: 0.1432 },
  GER: { pG: 0.9716, pR: 0.6305, pQ: 0.3873, pS: 0.177, pF: 0.0862, pC: 0.0368 },
  GHA: { pG: 0.0494, pR: 0.0071, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1313, pR: 0.1008, pQ: 0.0212, pS: 0.0031, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8974, pR: 0.4692, pQ: 0.2108, pS: 0.1102, pF: 0.0272, pC: 0.0083 },
  IRQ: { pG: 0.1234, pR: 0.0188, pQ: 0.0022, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1094, pR: 0.0101, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7077, pR: 0.4046, pQ: 0.1897, pS: 0.069, pF: 0.0271, pC: 0.0106 },
  KOR: { pG: 0.8055, pR: 0.5144, pQ: 0.2516, pS: 0.1014, pF: 0.023, pC: 0.0064 },
  KSA: { pG: 0.2132, pR: 0.0947, pQ: 0.0269, pS: 0.0067, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9696, pR: 0.7, pQ: 0.4291, pS: 0.2927, pF: 0.13, pC: 0.0572 },
  MEX: { pG: 0.9211, pR: 0.6568, pQ: 0.4207, pS: 0.2047, pF: 0.0709, pC: 0.0258 },
  NED: { pG: 0.8717, pR: 0.5953, pQ: 0.374, pS: 0.1698, pF: 0.0986, pC: 0.0465 },
  NOR: { pG: 0.2858, pR: 0.0726, pQ: 0.0127, pS: 0.0025, pF: 0.0014, pC: 0.0005 },
  NZL: { pG: 0.1521, pR: 0.1118, pQ: 0.0222, pS: 0.003, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2779, pR: 0.0767, pQ: 0.0174, pS: 0.0034, pF: 0.0018, pC: 0.0001 },
  PAR: { pG: 0.3752, pR: 0.1487, pQ: 0.0544, pS: 0.019, pF: 0.003, pC: 0.0003 },
  POR: { pG: 0.8575, pR: 0.4724, pQ: 0.2495, pS: 0.0973, pF: 0.0674, pC: 0.0335 },
  QAT: { pG: 0.4299, pR: 0.1838, pQ: 0.0592, pS: 0.0144, pF: 0.0015, pC: 0.0001 },
  RSA: { pG: 0.4263, pR: 0.2776, pQ: 0.0889, pS: 0.0257, pF: 0.0025, pC: 0.0002 },
  SCO: { pG: 0.6363, pR: 0.4837, pQ: 0.209, pS: 0.0802, pF: 0.0122, pC: 0.0027 },
  SEN: { pG: 0.6588, pR: 0.2832, pQ: 0.0817, pS: 0.0321, pF: 0.02, pC: 0.0076 },
  SUI: { pG: 0.8436, pR: 0.5056, pQ: 0.2936, pS: 0.1308, pF: 0.0434, pC: 0.0148 },
  SWE: { pG: 0.3453, pR: 0.1585, pQ: 0.0578, pS: 0.0171, pF: 0.0033, pC: 0.0007 },
  TUN: { pG: 0.2838, pR: 0.1182, pQ: 0.0336, pS: 0.0076, pF: 0.0007, pC: 0.0002 },
  TUR: { pG: 0.5944, pR: 0.2517, pQ: 0.1089, pS: 0.05, pF: 0.0119, pC: 0.0036 },
  URU: { pG: 0.8354, pR: 0.4422, pQ: 0.1484, pS: 0.0731, pF: 0.0324, pC: 0.0133 },
  USA: { pG: 0.7661, pR: 0.3682, pQ: 0.1766, pS: 0.0986, pF: 0.0343, pC: 0.0113 },
  UZB: { pG: 0.184, pR: 0.0324, pQ: 0.0063, pS: 0.0007, pF: 0.0001, pC: 0.0001 },
};
