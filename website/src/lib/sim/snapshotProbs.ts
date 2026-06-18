// Auto-generated from M2 batch batch_20260618_023108Z on 2026-06-18T02:31:08Z.
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
  ALG: { pG: 0.4296, pR: 0.1014, pQ: 0.0175, pS: 0.0038, pF: 0.002, pC: 0.0005 },
  ARG: { pG: 0.9533, pR: 0.6769, pQ: 0.4188, pS: 0.2688, pF: 0.2163, pC: 0.1377 },
  AUS: { pG: 0.5599, pR: 0.2247, pQ: 0.0946, pS: 0.0421, pF: 0.0083, pC: 0.002 },
  AUT: { pG: 0.5103, pR: 0.1324, pQ: 0.0267, pS: 0.0061, pF: 0.0027, pC: 0.0008 },
  BEL: { pG: 0.9713, pR: 0.5679, pQ: 0.2855, pS: 0.1653, pF: 0.0833, pC: 0.0379 },
  BIH: { pG: 0.2613, pR: 0.1057, pQ: 0.0288, pS: 0.005, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9723, pR: 0.7206, pQ: 0.4511, pS: 0.3087, pF: 0.1396, pC: 0.0652 },
  CAN: { pG: 0.6851, pR: 0.3366, pQ: 0.1443, pS: 0.0468, pF: 0.0086, pC: 0.0015 },
  CIV: { pG: 0.7682, pR: 0.4698, pQ: 0.1946, pS: 0.076, pF: 0.0122, pC: 0.0026 },
  COD: { pG: 0.2107, pR: 0.0401, pQ: 0.007, pS: 0.0005, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7516, pR: 0.3395, pQ: 0.1435, pS: 0.0446, pF: 0.0267, pC: 0.011 },
  CPV: { pG: 0.1361, pR: 0.0536, pQ: 0.0135, pS: 0.0026, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7653, pR: 0.4091, pQ: 0.1702, pS: 0.0558, pF: 0.0345, pC: 0.0155 },
  CUW: { pG: 0.1713, pR: 0.1133, pQ: 0.0228, pS: 0.0054, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6212, pR: 0.404, pQ: 0.1594, pS: 0.0516, pF: 0.0083, pC: 0.0019 },
  ECU: { pG: 0.8652, pR: 0.499, pQ: 0.2249, pS: 0.0943, pF: 0.026, pC: 0.0071 },
  EGY: { pG: 0.826, pR: 0.4795, pQ: 0.2125, pS: 0.0984, pF: 0.0205, pC: 0.0054 },
  ENG: { pG: 0.9091, pR: 0.6232, pQ: 0.4092, pS: 0.2049, pF: 0.1536, pC: 0.0884 },
  ESP: { pG: 0.9768, pR: 0.7771, pQ: 0.5861, pS: 0.4266, pF: 0.3113, pC: 0.1892 },
  FRA: { pG: 0.934, pR: 0.7112, pQ: 0.4432, pS: 0.2778, pF: 0.2266, pC: 0.1464 },
  GER: { pG: 0.9718, pR: 0.6204, pQ: 0.3789, pS: 0.1807, pF: 0.0935, pC: 0.041 },
  GHA: { pG: 0.0475, pR: 0.0061, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1326, pR: 0.1029, pQ: 0.0223, pS: 0.0044, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.9001, pR: 0.4799, pQ: 0.2157, pS: 0.111, pF: 0.0297, pC: 0.008 },
  IRQ: { pG: 0.1216, pR: 0.0185, pQ: 0.0017, pS: 0.0004, pF: 0.0001, pC: 0.0001 },
  JOR: { pG: 0.1068, pR: 0.0114, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7225, pR: 0.4087, pQ: 0.1841, pS: 0.0705, pF: 0.0294, pC: 0.0108 },
  KOR: { pG: 0.8014, pR: 0.5126, pQ: 0.2489, pS: 0.1039, pF: 0.0221, pC: 0.0056 },
  KSA: { pG: 0.2137, pR: 0.098, pQ: 0.024, pS: 0.0089, pF: 0.001, pC: 0.0002 },
  MAR: { pG: 0.9724, pR: 0.7118, pQ: 0.4235, pS: 0.2916, pF: 0.1292, pC: 0.0601 },
  MEX: { pG: 0.9258, pR: 0.655, pQ: 0.4207, pS: 0.2007, pF: 0.0691, pC: 0.0241 },
  NED: { pG: 0.8739, pR: 0.5955, pQ: 0.3906, pS: 0.1785, pF: 0.1049, pC: 0.0489 },
  NOR: { pG: 0.2766, pR: 0.0682, pQ: 0.0128, pS: 0.003, pF: 0.0012, pC: 0.0004 },
  NZL: { pG: 0.1506, pR: 0.1059, pQ: 0.0218, pS: 0.0033, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2781, pR: 0.0876, pQ: 0.0215, pS: 0.0035, pF: 0.0016, pC: 0.0001 },
  PAR: { pG: 0.377, pR: 0.1462, pQ: 0.053, pS: 0.0206, pF: 0.0039, pC: 0.0011 },
  POR: { pG: 0.8519, pR: 0.4599, pQ: 0.2423, pS: 0.0957, pF: 0.0686, pC: 0.035 },
  QAT: { pG: 0.4193, pR: 0.1854, pQ: 0.0586, pS: 0.0133, pF: 0.0013, pC: 0.0002 },
  RSA: { pG: 0.4323, pR: 0.2822, pQ: 0.0943, pS: 0.0265, pF: 0.002, pC: 0.0003 },
  SCO: { pG: 0.6269, pR: 0.4816, pQ: 0.2061, pS: 0.0771, pF: 0.0118, pC: 0.0031 },
  SEN: { pG: 0.6678, pR: 0.28, pQ: 0.0788, pS: 0.034, pF: 0.0201, pC: 0.0088 },
  SUI: { pG: 0.8536, pR: 0.5185, pQ: 0.3059, pS: 0.1279, pF: 0.0399, pC: 0.0114 },
  SWE: { pG: 0.3487, pR: 0.1661, pQ: 0.0565, pS: 0.019, pF: 0.0037, pC: 0.0003 },
  TUN: { pG: 0.2784, pR: 0.1272, pQ: 0.0396, pS: 0.0118, pF: 0.0017, pC: 0.0002 },
  TUR: { pG: 0.6046, pR: 0.2544, pQ: 0.1091, pS: 0.052, pF: 0.0139, pC: 0.0031 },
  URU: { pG: 0.8254, pR: 0.4381, pQ: 0.1489, pS: 0.0726, pF: 0.0334, pC: 0.0122 },
  USA: { pG: 0.7543, pR: 0.3578, pQ: 0.1794, pS: 0.1029, pF: 0.0359, pC: 0.0119 },
  UZB: { pG: 0.1858, pR: 0.0345, pQ: 0.0058, pS: 0.0011, pF: 0.0004, pC: 0.0 },
};
