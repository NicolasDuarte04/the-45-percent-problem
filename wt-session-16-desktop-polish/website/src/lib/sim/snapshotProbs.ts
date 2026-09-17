// Auto-generated from M2 batch batch_20260610_173121Z on 2026-06-10T17:31:21Z.
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
  ALG: { pG: 0.4213, pR: 0.1034, pQ: 0.0163, pS: 0.0044, pF: 0.0014, pC: 0.0003 },
  ARG: { pG: 0.9488, pR: 0.676, pQ: 0.4175, pS: 0.2681, pF: 0.2166, pC: 0.1385 },
  AUS: { pG: 0.6316, pR: 0.3049, pQ: 0.1379, pS: 0.0647, pF: 0.0142, pC: 0.0038 },
  AUT: { pG: 0.5188, pR: 0.1436, pQ: 0.0299, pS: 0.0082, pF: 0.0042, pC: 0.0012 },
  BEL: { pG: 0.9714, pR: 0.559, pQ: 0.2825, pS: 0.1705, pF: 0.0856, pC: 0.0374 },
  BIH: { pG: 0.2779, pR: 0.1065, pQ: 0.0292, pS: 0.0065, pF: 0.0006, pC: 0.0002 },
  BRA: { pG: 0.974, pR: 0.6986, pQ: 0.4244, pS: 0.2954, pF: 0.1381, pC: 0.0649 },
  CAN: { pG: 0.6653, pR: 0.331, pQ: 0.1421, pS: 0.0417, pF: 0.0094, pC: 0.002 },
  CIV: { pG: 0.7736, pR: 0.4725, pQ: 0.1964, pS: 0.0822, pF: 0.0138, pC: 0.0033 },
  COD: { pG: 0.214, pR: 0.04, pQ: 0.0067, pS: 0.0011, pF: 0.0003, pC: 0.0002 },
  COL: { pG: 0.7513, pR: 0.3288, pQ: 0.1338, pS: 0.0416, pF: 0.0237, pC: 0.0102 },
  CPV: { pG: 0.1353, pR: 0.0591, pQ: 0.0143, pS: 0.0034, pF: 0.0002, pC: 0.0001 },
  CRO: { pG: 0.7544, pR: 0.402, pQ: 0.1689, pS: 0.0544, pF: 0.0343, pC: 0.0155 },
  CUW: { pG: 0.1783, pR: 0.121, pQ: 0.0223, pS: 0.0046, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.638, pR: 0.4152, pQ: 0.1596, pS: 0.0542, pF: 0.0085, pC: 0.0018 },
  ECU: { pG: 0.8756, pR: 0.4901, pQ: 0.2238, pS: 0.0957, pF: 0.0243, pC: 0.0064 },
  EGY: { pG: 0.8274, pR: 0.4773, pQ: 0.2081, pS: 0.0931, pF: 0.0194, pC: 0.0038 },
  ENG: { pG: 0.9058, pR: 0.6286, pQ: 0.4163, pS: 0.1963, pF: 0.1492, pC: 0.0832 },
  ESP: { pG: 0.9786, pR: 0.7808, pQ: 0.5817, pS: 0.4204, pF: 0.305, pC: 0.1854 },
  FRA: { pG: 0.9324, pR: 0.6993, pQ: 0.4363, pS: 0.2862, pF: 0.2334, pC: 0.1511 },
  GER: { pG: 0.9734, pR: 0.6281, pQ: 0.3867, pS: 0.1788, pF: 0.0859, pC: 0.0389 },
  GHA: { pG: 0.0523, pR: 0.0065, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1232, pR: 0.0912, pQ: 0.0199, pS: 0.0047, pF: 0.0004, pC: 0.0 },
  IRN: { pG: 0.8972, pR: 0.4725, pQ: 0.2182, pS: 0.105, pF: 0.0299, pC: 0.009 },
  IRQ: { pG: 0.1182, pR: 0.0155, pQ: 0.0019, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1111, pR: 0.0131, pQ: 0.0014, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7139, pR: 0.4005, pQ: 0.1866, pS: 0.07, pF: 0.0281, pC: 0.0087 },
  KOR: { pG: 0.8047, pR: 0.5254, pQ: 0.251, pS: 0.0982, pF: 0.0249, pC: 0.0066 },
  KSA: { pG: 0.218, pR: 0.0998, pQ: 0.0248, pS: 0.0078, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9703, pR: 0.6994, pQ: 0.4087, pS: 0.2774, pF: 0.1304, pC: 0.063 },
  MEX: { pG: 0.92, pR: 0.6492, pQ: 0.4166, pS: 0.2006, pF: 0.0702, pC: 0.0258 },
  NED: { pG: 0.8703, pR: 0.6115, pQ: 0.3931, pS: 0.1812, pF: 0.104, pC: 0.0469 },
  NOR: { pG: 0.2823, pR: 0.0681, pQ: 0.0111, pS: 0.0032, pF: 0.0014, pC: 0.0003 },
  NZL: { pG: 0.1516, pR: 0.1091, pQ: 0.0211, pS: 0.0032, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2875, pR: 0.0855, pQ: 0.0182, pS: 0.0033, pF: 0.0017, pC: 0.0003 },
  PAR: { pG: 0.4295, pR: 0.1981, pQ: 0.0785, pS: 0.031, pF: 0.0049, pC: 0.0012 },
  POR: { pG: 0.8549, pR: 0.4779, pQ: 0.2506, pS: 0.0992, pF: 0.0678, pC: 0.0332 },
  QAT: { pG: 0.4168, pR: 0.1773, pQ: 0.0563, pS: 0.0134, pF: 0.0016, pC: 0.0003 },
  RSA: { pG: 0.4317, pR: 0.2796, pQ: 0.0906, pS: 0.0257, pF: 0.0027, pC: 0.0002 },
  SCO: { pG: 0.385, pR: 0.2809, pQ: 0.1168, pS: 0.0446, pF: 0.0074, pC: 0.0011 },
  SEN: { pG: 0.6671, pR: 0.281, pQ: 0.0856, pS: 0.033, pF: 0.0191, pC: 0.0072 },
  SUI: { pG: 0.8456, pR: 0.5158, pQ: 0.3049, pS: 0.1271, pF: 0.0395, pC: 0.0124 },
  SWE: { pG: 0.3386, pR: 0.1557, pQ: 0.0537, pS: 0.0184, pF: 0.0026, pC: 0.0003 },
  TUN: { pG: 0.2763, pR: 0.1206, pQ: 0.036, pS: 0.0095, pF: 0.0008, pC: 0.0003 },
  TUR: { pG: 0.6773, pR: 0.3198, pQ: 0.1472, pS: 0.0741, pF: 0.0177, pC: 0.0069 },
  URU: { pG: 0.8205, pR: 0.4424, pQ: 0.1507, pS: 0.0733, pF: 0.0339, pC: 0.0119 },
  USA: { pG: 0.8091, pR: 0.4071, pQ: 0.2163, pS: 0.1236, pF: 0.0418, pC: 0.0162 },
  UZB: { pG: 0.1798, pR: 0.0307, pQ: 0.0052, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
