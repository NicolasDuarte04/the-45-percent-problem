// Auto-generated from M2 batch batch_20260620_051024Z on 2026-06-20T05:10:24Z.
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
  ALG: { pG: 0.4218, pR: 0.1037, pQ: 0.0169, pS: 0.0041, pF: 0.0012, pC: 0.0006 },
  ARG: { pG: 0.9537, pR: 0.668, pQ: 0.4177, pS: 0.2645, pF: 0.2138, pC: 0.1366 },
  AUS: { pG: 0.5503, pR: 0.2325, pQ: 0.1041, pS: 0.0479, pF: 0.0101, pC: 0.0023 },
  AUT: { pG: 0.5155, pR: 0.1416, pQ: 0.026, pS: 0.0086, pF: 0.0048, pC: 0.0015 },
  BEL: { pG: 0.9744, pR: 0.5658, pQ: 0.2861, pS: 0.1658, pF: 0.082, pC: 0.0341 },
  BIH: { pG: 0.2714, pR: 0.1086, pQ: 0.0262, pS: 0.0054, pF: 0.001, pC: 0.0001 },
  BRA: { pG: 0.9723, pR: 0.7119, pQ: 0.4437, pS: 0.3051, pF: 0.1442, pC: 0.068 },
  CAN: { pG: 0.6839, pR: 0.34, pQ: 0.1467, pS: 0.0463, pF: 0.0121, pC: 0.002 },
  CIV: { pG: 0.7709, pR: 0.4721, pQ: 0.1891, pS: 0.0735, pF: 0.0127, pC: 0.0027 },
  COD: { pG: 0.2123, pR: 0.0417, pQ: 0.0078, pS: 0.0006, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7404, pR: 0.332, pQ: 0.1363, pS: 0.0434, pF: 0.0254, pC: 0.0099 },
  CPV: { pG: 0.124, pR: 0.0536, pQ: 0.0105, pS: 0.0029, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7644, pR: 0.4135, pQ: 0.1725, pS: 0.0596, pF: 0.0384, pC: 0.0183 },
  CUW: { pG: 0.1714, pR: 0.1133, pQ: 0.0246, pS: 0.0046, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6277, pR: 0.4064, pQ: 0.1657, pS: 0.0582, pF: 0.0081, pC: 0.0014 },
  ECU: { pG: 0.8638, pR: 0.4904, pQ: 0.2222, pS: 0.0945, pF: 0.0224, pC: 0.0063 },
  EGY: { pG: 0.8332, pR: 0.4761, pQ: 0.211, pS: 0.0973, pF: 0.0198, pC: 0.0056 },
  ENG: { pG: 0.9081, pR: 0.6193, pQ: 0.4098, pS: 0.2009, pF: 0.1504, pC: 0.0881 },
  ESP: { pG: 0.98, pR: 0.776, pQ: 0.5868, pS: 0.4278, pF: 0.3156, pC: 0.1924 },
  FRA: { pG: 0.9339, pR: 0.7069, pQ: 0.4421, pS: 0.2835, pF: 0.2333, pC: 0.1496 },
  GER: { pG: 0.9726, pR: 0.6312, pQ: 0.3855, pS: 0.18, pF: 0.0893, pC: 0.0392 },
  GHA: { pG: 0.054, pR: 0.0065, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.134, pR: 0.1068, pQ: 0.0242, pS: 0.0051, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8898, pR: 0.4696, pQ: 0.2143, pS: 0.1101, pF: 0.0278, pC: 0.0075 },
  IRQ: { pG: 0.117, pR: 0.016, pQ: 0.0019, pS: 0.0004, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.109, pR: 0.0123, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7191, pR: 0.4037, pQ: 0.1869, pS: 0.0675, pF: 0.0272, pC: 0.0094 },
  KOR: { pG: 0.8117, pR: 0.5212, pQ: 0.2566, pS: 0.1026, pF: 0.0225, pC: 0.0058 },
  KSA: { pG: 0.2187, pR: 0.1032, pQ: 0.0284, pS: 0.009, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9694, pR: 0.696, pQ: 0.4151, pS: 0.2812, pF: 0.1247, pC: 0.0549 },
  MEX: { pG: 0.9232, pR: 0.6557, pQ: 0.4172, pS: 0.2005, pF: 0.0695, pC: 0.0246 },
  NED: { pG: 0.8701, pR: 0.597, pQ: 0.3862, pS: 0.1803, pF: 0.1034, pC: 0.0485 },
  NOR: { pG: 0.2879, pR: 0.0751, pQ: 0.0129, pS: 0.0026, pF: 0.001, pC: 0.0002 },
  NZL: { pG: 0.1483, pR: 0.1074, pQ: 0.0199, pS: 0.0035, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2735, pR: 0.0827, pQ: 0.0168, pS: 0.0019, pF: 0.0008, pC: 0.0002 },
  PAR: { pG: 0.3672, pR: 0.1449, pQ: 0.0526, pS: 0.0193, pF: 0.0032, pC: 0.0005 },
  POR: { pG: 0.857, pR: 0.4714, pQ: 0.2509, pS: 0.0989, pF: 0.0699, pC: 0.0344 },
  QAT: { pG: 0.4148, pR: 0.1783, pQ: 0.0558, pS: 0.0148, pF: 0.0017, pC: 0.0006 },
  RSA: { pG: 0.426, pR: 0.2789, pQ: 0.0909, pS: 0.0221, pF: 0.0021, pC: 0.0005 },
  SCO: { pG: 0.6299, pR: 0.4814, pQ: 0.2016, pS: 0.0766, pF: 0.0112, pC: 0.0021 },
  SEN: { pG: 0.6612, pR: 0.2764, pQ: 0.082, pS: 0.0304, pF: 0.0193, pC: 0.0077 },
  SUI: { pG: 0.8413, pR: 0.5109, pQ: 0.3025, pS: 0.1323, pF: 0.0445, pC: 0.0164 },
  SWE: { pG: 0.3461, pR: 0.1645, pQ: 0.0574, pS: 0.019, pF: 0.003, pC: 0.0006 },
  TUN: { pG: 0.286, pR: 0.1278, pQ: 0.0421, pS: 0.0127, pF: 0.002, pC: 0.0003 },
  TUR: { pG: 0.6033, pR: 0.2544, pQ: 0.1099, pS: 0.0539, pF: 0.0135, pC: 0.0036 },
  URU: { pG: 0.8316, pR: 0.4483, pQ: 0.149, pS: 0.0732, pF: 0.0298, pC: 0.0109 },
  USA: { pG: 0.7736, pR: 0.3721, pQ: 0.1872, pS: 0.107, pF: 0.0368, pC: 0.0126 },
  UZB: { pG: 0.1903, pR: 0.0329, pQ: 0.0055, pS: 0.0006, pF: 0.0001, pC: 0.0 },
};
