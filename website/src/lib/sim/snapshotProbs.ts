// Auto-generated from M2 batch batch_20260612_231446Z on 2026-06-12T23:14:46Z.
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
  ALG: { pG: 0.4303, pR: 0.1015, pQ: 0.0179, pS: 0.0045, pF: 0.0022, pC: 0.0004 },
  ARG: { pG: 0.9531, pR: 0.6828, pQ: 0.4164, pS: 0.2676, pF: 0.2158, pC: 0.1362 },
  AUS: { pG: 0.5582, pR: 0.2315, pQ: 0.0991, pS: 0.0442, pF: 0.0106, pC: 0.0025 },
  AUT: { pG: 0.5094, pR: 0.1354, pQ: 0.0266, pS: 0.0067, pF: 0.0033, pC: 0.0007 },
  BEL: { pG: 0.9727, pR: 0.5649, pQ: 0.2921, pS: 0.1739, pF: 0.0831, pC: 0.0369 },
  BIH: { pG: 0.2682, pR: 0.1066, pQ: 0.0263, pS: 0.0078, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.9731, pR: 0.7053, pQ: 0.4382, pS: 0.303, pF: 0.1436, pC: 0.0664 },
  CAN: { pG: 0.6754, pR: 0.3322, pQ: 0.145, pS: 0.0459, pF: 0.0098, pC: 0.0022 },
  CIV: { pG: 0.7717, pR: 0.4631, pQ: 0.1948, pS: 0.0802, pF: 0.0133, pC: 0.0028 },
  COD: { pG: 0.2132, pR: 0.0377, pQ: 0.0064, pS: 0.0005, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7459, pR: 0.3275, pQ: 0.131, pS: 0.0397, pF: 0.0244, pC: 0.0102 },
  CPV: { pG: 0.1315, pR: 0.0588, pQ: 0.0135, pS: 0.0036, pF: 0.0005, pC: 0.0001 },
  CRO: { pG: 0.7624, pR: 0.4082, pQ: 0.169, pS: 0.0608, pF: 0.0385, pC: 0.0167 },
  CUW: { pG: 0.1752, pR: 0.1219, pQ: 0.0244, pS: 0.0046, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6247, pR: 0.405, pQ: 0.1618, pS: 0.0531, pF: 0.0067, pC: 0.0014 },
  ECU: { pG: 0.8602, pR: 0.4935, pQ: 0.2255, pS: 0.0934, pF: 0.0251, pC: 0.0069 },
  EGY: { pG: 0.8353, pR: 0.4845, pQ: 0.2106, pS: 0.096, pF: 0.0172, pC: 0.0039 },
  ENG: { pG: 0.9073, pR: 0.6255, pQ: 0.4114, pS: 0.1939, pF: 0.1467, pC: 0.0872 },
  ESP: { pG: 0.9765, pR: 0.7714, pQ: 0.5831, pS: 0.4201, pF: 0.3106, pC: 0.1858 },
  FRA: { pG: 0.9377, pR: 0.7094, pQ: 0.4449, pS: 0.2816, pF: 0.2329, pC: 0.1531 },
  GER: { pG: 0.9701, pR: 0.6186, pQ: 0.3766, pS: 0.172, pF: 0.088, pC: 0.0405 },
  GHA: { pG: 0.0466, pR: 0.0067, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1294, pR: 0.1054, pQ: 0.0224, pS: 0.0035, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8966, pR: 0.4745, pQ: 0.2149, pS: 0.1088, pF: 0.0295, pC: 0.0084 },
  IRQ: { pG: 0.1165, pR: 0.0149, pQ: 0.0014, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1072, pR: 0.0099, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7192, pR: 0.4061, pQ: 0.1858, pS: 0.069, pF: 0.0271, pC: 0.0091 },
  KOR: { pG: 0.8146, pR: 0.533, pQ: 0.2619, pS: 0.1057, pF: 0.0218, pC: 0.006 },
  KSA: { pG: 0.217, pR: 0.096, pQ: 0.024, pS: 0.0073, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9738, pR: 0.7103, pQ: 0.427, pS: 0.2959, pF: 0.1327, pC: 0.0571 },
  MEX: { pG: 0.9226, pR: 0.6602, pQ: 0.4268, pS: 0.1994, pF: 0.0673, pC: 0.0249 },
  NED: { pG: 0.8677, pR: 0.6063, pQ: 0.3893, pS: 0.1845, pF: 0.1076, pC: 0.0504 },
  NOR: { pG: 0.2771, pR: 0.0706, pQ: 0.012, pS: 0.0036, pF: 0.0018, pC: 0.0005 },
  NZL: { pG: 0.1465, pR: 0.1042, pQ: 0.0197, pS: 0.0031, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2837, pR: 0.0939, pQ: 0.0219, pS: 0.0036, pF: 0.0012, pC: 0.0001 },
  PAR: { pG: 0.3746, pR: 0.1439, pQ: 0.0531, pS: 0.0206, pF: 0.0032, pC: 0.0004 },
  POR: { pG: 0.8608, pR: 0.4696, pQ: 0.2549, pS: 0.1038, pF: 0.0731, pC: 0.0377 },
  QAT: { pG: 0.4179, pR: 0.1759, pQ: 0.0592, pS: 0.0161, pF: 0.0015, pC: 0.0001 },
  RSA: { pG: 0.4311, pR: 0.2831, pQ: 0.0918, pS: 0.0233, pF: 0.0023, pC: 0.0004 },
  SCO: { pG: 0.6342, pR: 0.4795, pQ: 0.1999, pS: 0.0733, pF: 0.0091, pC: 0.0017 },
  SEN: { pG: 0.6687, pR: 0.2755, pQ: 0.0801, pS: 0.0329, pF: 0.0204, pC: 0.007 },
  SUI: { pG: 0.8455, pR: 0.504, pQ: 0.2901, pS: 0.1238, pF: 0.0418, pC: 0.0124 },
  SWE: { pG: 0.3567, pR: 0.1658, pQ: 0.0588, pS: 0.0197, pF: 0.0036, pC: 0.0012 },
  TUN: { pG: 0.2792, pR: 0.1247, pQ: 0.0395, pS: 0.0126, pF: 0.0015, pC: 0.0006 },
  TUR: { pG: 0.5965, pR: 0.2557, pQ: 0.1107, pS: 0.0548, pF: 0.0141, pC: 0.0032 },
  URU: { pG: 0.8239, pR: 0.4457, pQ: 0.1474, pS: 0.0747, pF: 0.0328, pC: 0.0122 },
  USA: { pG: 0.7602, pR: 0.3684, pQ: 0.1867, pS: 0.1061, pF: 0.0336, pC: 0.0126 },
  UZB: { pG: 0.1801, pR: 0.0309, pQ: 0.0047, pS: 0.0006, pF: 0.0001, pC: 0.0 },
};
