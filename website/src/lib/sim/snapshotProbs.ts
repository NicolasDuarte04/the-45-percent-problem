// Auto-generated from M2 batch batch_20260617_090020Z on 2026-06-17T09:00:20Z.
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
  ALG: { pG: 0.4247, pR: 0.103, pQ: 0.0173, pS: 0.0052, pF: 0.0023, pC: 0.0006 },
  ARG: { pG: 0.9526, pR: 0.6762, pQ: 0.4214, pS: 0.2698, pF: 0.2184, pC: 0.1416 },
  AUS: { pG: 0.5601, pR: 0.2299, pQ: 0.1006, pS: 0.0445, pF: 0.011, pC: 0.0023 },
  AUT: { pG: 0.5153, pR: 0.139, pQ: 0.0302, pS: 0.0091, pF: 0.0045, pC: 0.0015 },
  BEL: { pG: 0.9756, pR: 0.5686, pQ: 0.2844, pS: 0.166, pF: 0.0823, pC: 0.0367 },
  BIH: { pG: 0.2711, pR: 0.1097, pQ: 0.0299, pS: 0.0064, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9737, pR: 0.7092, pQ: 0.4396, pS: 0.2992, pF: 0.1397, pC: 0.0667 },
  CAN: { pG: 0.6717, pR: 0.33, pQ: 0.1411, pS: 0.0473, pF: 0.0087, pC: 0.0019 },
  CIV: { pG: 0.7669, pR: 0.4671, pQ: 0.1949, pS: 0.0752, pF: 0.0126, pC: 0.0028 },
  COD: { pG: 0.2017, pR: 0.0385, pQ: 0.0057, pS: 0.001, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7478, pR: 0.3323, pQ: 0.1335, pS: 0.0428, pF: 0.0277, pC: 0.0107 },
  CPV: { pG: 0.1342, pR: 0.0582, pQ: 0.012, pS: 0.002, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7682, pR: 0.4104, pQ: 0.1779, pS: 0.0599, pF: 0.0395, pC: 0.0186 },
  CUW: { pG: 0.1749, pR: 0.1166, pQ: 0.0243, pS: 0.0052, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6249, pR: 0.4111, pQ: 0.1591, pS: 0.0531, pF: 0.0074, pC: 0.0017 },
  ECU: { pG: 0.8714, pR: 0.5008, pQ: 0.2273, pS: 0.0928, pF: 0.0242, pC: 0.0068 },
  EGY: { pG: 0.831, pR: 0.4729, pQ: 0.2109, pS: 0.0982, pF: 0.021, pC: 0.0056 },
  ENG: { pG: 0.9068, pR: 0.627, pQ: 0.4078, pS: 0.1925, pF: 0.1458, pC: 0.0813 },
  ESP: { pG: 0.9773, pR: 0.78, pQ: 0.5889, pS: 0.4287, pF: 0.3088, pC: 0.189 },
  FRA: { pG: 0.9321, pR: 0.7017, pQ: 0.439, pS: 0.2793, pF: 0.224, pC: 0.1458 },
  GER: { pG: 0.9699, pR: 0.6154, pQ: 0.3697, pS: 0.1704, pF: 0.0899, pC: 0.0382 },
  GHA: { pG: 0.0446, pR: 0.0045, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.134, pR: 0.1044, pQ: 0.0214, pS: 0.003, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8961, pR: 0.474, pQ: 0.2187, pS: 0.1099, pF: 0.0297, pC: 0.0091 },
  IRQ: { pG: 0.1157, pR: 0.0171, pQ: 0.0014, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1074, pR: 0.0113, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7189, pR: 0.4121, pQ: 0.1927, pS: 0.076, pF: 0.0335, pC: 0.0111 },
  KOR: { pG: 0.807, pR: 0.5337, pQ: 0.255, pS: 0.106, pF: 0.0265, pC: 0.0079 },
  KSA: { pG: 0.2129, pR: 0.0968, pQ: 0.0233, pS: 0.0078, pF: 0.0009, pC: 0.0001 },
  MAR: { pG: 0.971, pR: 0.7128, pQ: 0.4337, pS: 0.2993, pF: 0.1295, pC: 0.0594 },
  MEX: { pG: 0.9191, pR: 0.6537, pQ: 0.4173, pS: 0.1985, pF: 0.0688, pC: 0.024 },
  NED: { pG: 0.8762, pR: 0.6035, pQ: 0.3891, pS: 0.1784, pF: 0.0994, pC: 0.0453 },
  NOR: { pG: 0.2799, pR: 0.0695, pQ: 0.0121, pS: 0.0029, pF: 0.0012, pC: 0.0003 },
  NZL: { pG: 0.1466, pR: 0.1035, pQ: 0.0194, pS: 0.0034, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2804, pR: 0.0804, pQ: 0.0172, pS: 0.003, pF: 0.0013, pC: 0.0003 },
  PAR: { pG: 0.3693, pR: 0.1447, pQ: 0.0514, pS: 0.02, pF: 0.0036, pC: 0.0009 },
  POR: { pG: 0.8569, pR: 0.474, pQ: 0.2519, pS: 0.1041, pF: 0.0705, pC: 0.0343 },
  QAT: { pG: 0.4209, pR: 0.1815, pQ: 0.0552, pS: 0.0132, pF: 0.0019, pC: 0.0002 },
  RSA: { pG: 0.4386, pR: 0.2779, pQ: 0.0906, pS: 0.0258, pF: 0.0027, pC: 0.0002 },
  SCO: { pG: 0.6212, pR: 0.471, pQ: 0.2038, pS: 0.0764, pF: 0.0116, pC: 0.0024 },
  SEN: { pG: 0.6723, pR: 0.2822, pQ: 0.0778, pS: 0.0295, pF: 0.0163, pC: 0.0069 },
  SUI: { pG: 0.8467, pR: 0.5024, pQ: 0.2995, pS: 0.1261, pF: 0.043, pC: 0.0141 },
  SWE: { pG: 0.3415, pR: 0.1564, pQ: 0.0537, pS: 0.0161, pF: 0.0027, pC: 0.0004 },
  TUN: { pG: 0.2803, pR: 0.1281, pQ: 0.0411, pS: 0.0119, pF: 0.0024, pC: 0.0007 },
  TUR: { pG: 0.6046, pR: 0.2605, pQ: 0.1123, pS: 0.0547, pF: 0.0154, pC: 0.0046 },
  URU: { pG: 0.8263, pR: 0.446, pQ: 0.1496, pS: 0.0749, pF: 0.0329, pC: 0.0123 },
  USA: { pG: 0.7661, pR: 0.3675, pQ: 0.1895, pS: 0.1096, pF: 0.037, pC: 0.0137 },
  UZB: { pG: 0.1936, pR: 0.0329, pQ: 0.0058, pS: 0.0007, pF: 0.0003, pC: 0.0 },
};
