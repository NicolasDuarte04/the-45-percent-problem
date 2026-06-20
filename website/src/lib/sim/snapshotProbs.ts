// Auto-generated from M2 batch batch_20260620_000636Z on 2026-06-20T00:06:36Z.
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
  ALG: { pG: 0.4288, pR: 0.1017, pQ: 0.0181, pS: 0.0049, pF: 0.0021, pC: 0.0005 },
  ARG: { pG: 0.9513, pR: 0.6825, pQ: 0.4152, pS: 0.265, pF: 0.2153, pC: 0.1424 },
  AUS: { pG: 0.5631, pR: 0.2361, pQ: 0.1031, pS: 0.0497, pF: 0.0134, pC: 0.0036 },
  AUT: { pG: 0.5065, pR: 0.134, pQ: 0.0264, pS: 0.0078, pF: 0.004, pC: 0.0012 },
  BEL: { pG: 0.9734, pR: 0.5629, pQ: 0.2898, pS: 0.1753, pF: 0.0811, pC: 0.0355 },
  BIH: { pG: 0.271, pR: 0.1057, pQ: 0.0275, pS: 0.005, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9758, pR: 0.7164, pQ: 0.4475, pS: 0.3123, pF: 0.1465, pC: 0.0672 },
  CAN: { pG: 0.6912, pR: 0.3401, pQ: 0.1467, pS: 0.0483, pF: 0.0103, pC: 0.0024 },
  CIV: { pG: 0.7664, pR: 0.4638, pQ: 0.1924, pS: 0.0772, pF: 0.0134, pC: 0.0038 },
  COD: { pG: 0.2036, pR: 0.0378, pQ: 0.0073, pS: 0.0006, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7476, pR: 0.3285, pQ: 0.1289, pS: 0.0399, pF: 0.0241, pC: 0.0103 },
  CPV: { pG: 0.1339, pR: 0.0581, pQ: 0.0145, pS: 0.0029, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7651, pR: 0.4134, pQ: 0.1808, pS: 0.0622, pF: 0.038, pC: 0.016 },
  CUW: { pG: 0.1799, pR: 0.123, pQ: 0.0262, pS: 0.0041, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6164, pR: 0.3947, pQ: 0.1599, pS: 0.0536, pF: 0.0086, pC: 0.0016 },
  ECU: { pG: 0.8745, pR: 0.5028, pQ: 0.2289, pS: 0.1, pF: 0.0257, pC: 0.0073 },
  EGY: { pG: 0.8255, pR: 0.4828, pQ: 0.2178, pS: 0.1042, pF: 0.0202, pC: 0.0044 },
  ENG: { pG: 0.9135, pR: 0.6274, pQ: 0.4081, pS: 0.1945, pF: 0.1489, pC: 0.0841 },
  ESP: { pG: 0.974, pR: 0.7676, pQ: 0.5831, pS: 0.4196, pF: 0.3061, pC: 0.1884 },
  FRA: { pG: 0.9353, pR: 0.7109, pQ: 0.4441, pS: 0.289, pF: 0.2364, pC: 0.153 },
  GER: { pG: 0.9704, pR: 0.6157, pQ: 0.3765, pS: 0.1761, pF: 0.089, pC: 0.0377 },
  GHA: { pG: 0.0489, pR: 0.0065, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1263, pR: 0.0998, pQ: 0.0219, pS: 0.0044, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8998, pR: 0.4811, pQ: 0.2136, pS: 0.1072, pF: 0.0308, pC: 0.0084 },
  IRQ: { pG: 0.1162, pR: 0.0162, pQ: 0.0018, pS: 0.0, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1134, pR: 0.0119, pQ: 0.0005, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7134, pR: 0.409, pQ: 0.1857, pS: 0.072, pF: 0.0292, pC: 0.0093 },
  KOR: { pG: 0.8069, pR: 0.5302, pQ: 0.2572, pS: 0.1013, pF: 0.0261, pC: 0.0072 },
  KSA: { pG: 0.2118, pR: 0.092, pQ: 0.0239, pS: 0.0085, pF: 0.001, pC: 0.0002 },
  MAR: { pG: 0.9741, pR: 0.7019, pQ: 0.4233, pS: 0.2848, pF: 0.1311, pC: 0.0578 },
  MEX: { pG: 0.9228, pR: 0.6564, pQ: 0.4246, pS: 0.2054, pF: 0.0739, pC: 0.0266 },
  NED: { pG: 0.8687, pR: 0.5975, pQ: 0.3838, pS: 0.1768, pF: 0.0971, pC: 0.0463 },
  NOR: { pG: 0.2837, pR: 0.0673, pQ: 0.0103, pS: 0.0024, pF: 0.0007, pC: 0.0004 },
  NZL: { pG: 0.1553, pR: 0.1102, pQ: 0.0221, pS: 0.0023, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2725, pR: 0.0818, pQ: 0.0184, pS: 0.0026, pF: 0.0006, pC: 0.0 },
  PAR: { pG: 0.3677, pR: 0.1394, pQ: 0.0471, pS: 0.0168, pF: 0.003, pC: 0.0009 },
  POR: { pG: 0.8602, pR: 0.4699, pQ: 0.2502, pS: 0.098, pF: 0.0694, pC: 0.0329 },
  QAT: { pG: 0.4167, pR: 0.1812, pQ: 0.057, pS: 0.0137, pF: 0.0012, pC: 0.0 },
  RSA: { pG: 0.4327, pR: 0.2815, pQ: 0.0932, pS: 0.0276, pF: 0.0022, pC: 0.0004 },
  SCO: { pG: 0.6285, pR: 0.4831, pQ: 0.2018, pS: 0.0746, pF: 0.0095, pC: 0.0024 },
  SEN: { pG: 0.6648, pR: 0.2755, pQ: 0.0836, pS: 0.0325, pF: 0.0184, pC: 0.007 },
  SUI: { pG: 0.8423, pR: 0.5102, pQ: 0.2995, pS: 0.1212, pF: 0.0379, pC: 0.0115 },
  SWE: { pG: 0.3454, pR: 0.161, pQ: 0.056, pS: 0.0155, pF: 0.0029, pC: 0.0006 },
  TUN: { pG: 0.2813, pR: 0.1272, pQ: 0.0391, pS: 0.0113, pF: 0.0016, pC: 0.0004 },
  TUR: { pG: 0.6021, pR: 0.2526, pQ: 0.1091, pS: 0.0506, pF: 0.0137, pC: 0.0039 },
  URU: { pG: 0.8263, pR: 0.4453, pQ: 0.1466, pS: 0.0729, pF: 0.0298, pC: 0.0114 },
  USA: { pG: 0.7624, pR: 0.3707, pQ: 0.1806, pS: 0.1048, pF: 0.0357, pC: 0.013 },
  UZB: { pG: 0.1886, pR: 0.0347, pQ: 0.0058, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
