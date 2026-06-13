// Auto-generated from M2 batch batch_20260613_115555Z on 2026-06-13T11:55:55Z.
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
  ALG: { pG: 0.4203, pR: 0.099, pQ: 0.0172, pS: 0.0048, pF: 0.0025, pC: 0.0005 },
  ARG: { pG: 0.9526, pR: 0.6728, pQ: 0.42, pS: 0.2705, pF: 0.2162, pC: 0.1415 },
  AUS: { pG: 0.5606, pR: 0.2345, pQ: 0.1033, pS: 0.0506, pF: 0.0112, pC: 0.0035 },
  AUT: { pG: 0.5188, pR: 0.1425, pQ: 0.0272, pS: 0.0085, pF: 0.0034, pC: 0.0012 },
  BEL: { pG: 0.9715, pR: 0.5715, pQ: 0.2857, pS: 0.1682, pF: 0.0834, pC: 0.0353 },
  BIH: { pG: 0.2656, pR: 0.1053, pQ: 0.0282, pS: 0.0051, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9736, pR: 0.7149, pQ: 0.439, pS: 0.3001, pF: 0.1441, pC: 0.0704 },
  CAN: { pG: 0.678, pR: 0.3309, pQ: 0.1476, pS: 0.0479, pF: 0.0095, pC: 0.0019 },
  CIV: { pG: 0.7695, pR: 0.4726, pQ: 0.1927, pS: 0.0765, pF: 0.0145, pC: 0.0033 },
  COD: { pG: 0.209, pR: 0.0392, pQ: 0.0072, pS: 0.0006, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7435, pR: 0.3298, pQ: 0.1378, pS: 0.043, pF: 0.0263, pC: 0.0115 },
  CPV: { pG: 0.1389, pR: 0.0595, pQ: 0.0134, pS: 0.004, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7705, pR: 0.4124, pQ: 0.1718, pS: 0.0566, pF: 0.0352, pC: 0.0159 },
  CUW: { pG: 0.174, pR: 0.1208, pQ: 0.0238, pS: 0.0047, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6315, pR: 0.4087, pQ: 0.1624, pS: 0.0563, pF: 0.0078, pC: 0.0016 },
  ECU: { pG: 0.8735, pR: 0.4992, pQ: 0.2272, pS: 0.0951, pF: 0.026, pC: 0.007 },
  EGY: { pG: 0.828, pR: 0.4765, pQ: 0.2061, pS: 0.094, pF: 0.021, pC: 0.0049 },
  ENG: { pG: 0.9084, pR: 0.6232, pQ: 0.4124, pS: 0.1958, pF: 0.1488, pC: 0.0871 },
  ESP: { pG: 0.9772, pR: 0.7763, pQ: 0.5861, pS: 0.4269, pF: 0.3087, pC: 0.1868 },
  FRA: { pG: 0.9347, pR: 0.7039, pQ: 0.44, pS: 0.2852, pF: 0.2257, pC: 0.1457 },
  GER: { pG: 0.9739, pR: 0.6234, pQ: 0.3801, pS: 0.1747, pF: 0.0867, pC: 0.0397 },
  GHA: { pG: 0.0507, pR: 0.0082, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1284, pR: 0.0995, pQ: 0.0214, pS: 0.0035, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8911, pR: 0.4728, pQ: 0.2219, pS: 0.1131, pF: 0.0302, pC: 0.0093 },
  IRQ: { pG: 0.1233, pR: 0.0196, pQ: 0.0011, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1083, pR: 0.01, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7151, pR: 0.4049, pQ: 0.1866, pS: 0.0723, pF: 0.0296, pC: 0.0089 },
  KOR: { pG: 0.8077, pR: 0.5231, pQ: 0.2577, pS: 0.0979, pF: 0.0242, pC: 0.0051 },
  KSA: { pG: 0.2133, pR: 0.0943, pQ: 0.0242, pS: 0.0072, pF: 0.0002, pC: 0.0001 },
  MAR: { pG: 0.9722, pR: 0.7098, pQ: 0.4296, pS: 0.293, pF: 0.1307, pC: 0.0579 },
  MEX: { pG: 0.9191, pR: 0.6586, pQ: 0.4128, pS: 0.1987, pF: 0.073, pC: 0.0244 },
  NED: { pG: 0.8633, pR: 0.594, pQ: 0.386, pS: 0.1803, pF: 0.103, pC: 0.0483 },
  NOR: { pG: 0.2779, pR: 0.0715, pQ: 0.0105, pS: 0.0027, pF: 0.0015, pC: 0.0003 },
  NZL: { pG: 0.1558, pR: 0.1072, pQ: 0.0207, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2704, pR: 0.0818, pQ: 0.0174, pS: 0.0025, pF: 0.0012, pC: 0.0001 },
  PAR: { pG: 0.3716, pR: 0.1432, pQ: 0.0545, pS: 0.0189, pF: 0.0026, pC: 0.0003 },
  POR: { pG: 0.8613, pR: 0.4701, pQ: 0.2474, pS: 0.096, pF: 0.0659, pC: 0.0356 },
  QAT: { pG: 0.4229, pR: 0.1839, pQ: 0.0585, pS: 0.0124, pF: 0.0012, pC: 0.0001 },
  RSA: { pG: 0.4265, pR: 0.2786, pQ: 0.0886, pS: 0.0253, pF: 0.0028, pC: 0.0003 },
  SCO: { pG: 0.6327, pR: 0.4839, pQ: 0.2123, pS: 0.0811, pF: 0.0109, pC: 0.0024 },
  SEN: { pG: 0.6641, pR: 0.2807, pQ: 0.0833, pS: 0.0333, pF: 0.0198, pC: 0.0072 },
  SUI: { pG: 0.8487, pR: 0.5109, pQ: 0.2964, pS: 0.1279, pF: 0.04, pC: 0.0126 },
  SWE: { pG: 0.347, pR: 0.1608, pQ: 0.0564, pS: 0.0188, pF: 0.0038, pC: 0.0009 },
  TUN: { pG: 0.2837, pR: 0.1243, pQ: 0.0395, pS: 0.0108, pF: 0.0012, pC: 0.0002 },
  TUR: { pG: 0.6043, pR: 0.2577, pQ: 0.1101, pS: 0.0547, pF: 0.0146, pC: 0.0034 },
  URU: { pG: 0.8242, pR: 0.4419, pQ: 0.1496, pS: 0.0727, pF: 0.0322, pC: 0.0097 },
  USA: { pG: 0.7566, pR: 0.3565, pQ: 0.1776, pS: 0.1035, pF: 0.0389, pC: 0.0151 },
  UZB: { pG: 0.1862, pR: 0.0353, pQ: 0.0057, pS: 0.0004, pF: 0.0002, pC: 0.0 },
};
