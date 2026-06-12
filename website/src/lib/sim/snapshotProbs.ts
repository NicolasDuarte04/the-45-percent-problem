// Auto-generated from M2 batch batch_20260612_021413Z on 2026-06-12T02:14:13Z.
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
  ALG: { pG: 0.4277, pR: 0.1013, pQ: 0.0155, pS: 0.0053, pF: 0.0029, pC: 0.0011 },
  ARG: { pG: 0.9475, pR: 0.6724, pQ: 0.4144, pS: 0.2701, pF: 0.218, pC: 0.1342 },
  AUS: { pG: 0.5617, pR: 0.2277, pQ: 0.0922, pS: 0.0427, pF: 0.0101, pC: 0.0026 },
  AUT: { pG: 0.5153, pR: 0.1401, pQ: 0.0286, pS: 0.007, pF: 0.0035, pC: 0.0007 },
  BEL: { pG: 0.9718, pR: 0.5676, pQ: 0.2864, pS: 0.1714, pF: 0.0853, pC: 0.0361 },
  BIH: { pG: 0.283, pR: 0.114, pQ: 0.0292, pS: 0.0054, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.973, pR: 0.7127, pQ: 0.4391, pS: 0.3028, pF: 0.1428, pC: 0.0683 },
  CAN: { pG: 0.6764, pR: 0.3418, pQ: 0.1416, pS: 0.0464, pF: 0.0099, pC: 0.0019 },
  CIV: { pG: 0.7655, pR: 0.4737, pQ: 0.1901, pS: 0.0756, pF: 0.0115, pC: 0.0027 },
  COD: { pG: 0.2113, pR: 0.0388, pQ: 0.0049, pS: 0.0008, pF: 0.0003, pC: 0.0 },
  COL: { pG: 0.7463, pR: 0.3289, pQ: 0.1308, pS: 0.0401, pF: 0.024, pC: 0.0099 },
  CPV: { pG: 0.1323, pR: 0.0554, pQ: 0.0138, pS: 0.003, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7657, pR: 0.4127, pQ: 0.1782, pS: 0.0621, pF: 0.0421, pC: 0.0202 },
  CUW: { pG: 0.1842, pR: 0.1261, pQ: 0.0239, pS: 0.0058, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6174, pR: 0.4, pQ: 0.1604, pS: 0.055, pF: 0.0092, pC: 0.0015 },
  ECU: { pG: 0.8646, pR: 0.49, pQ: 0.2224, pS: 0.0983, pF: 0.0241, pC: 0.0063 },
  EGY: { pG: 0.8333, pR: 0.4816, pQ: 0.2157, pS: 0.1019, pF: 0.0207, pC: 0.0046 },
  ENG: { pG: 0.9123, pR: 0.6281, pQ: 0.4071, pS: 0.1878, pF: 0.1427, pC: 0.0842 },
  ESP: { pG: 0.9778, pR: 0.774, pQ: 0.5842, pS: 0.4227, pF: 0.3073, pC: 0.1886 },
  FRA: { pG: 0.9337, pR: 0.71, pQ: 0.4471, pS: 0.2913, pF: 0.2392, pC: 0.1524 },
  GER: { pG: 0.9694, pR: 0.6239, pQ: 0.391, pS: 0.1837, pF: 0.0907, pC: 0.0392 },
  GHA: { pG: 0.0471, pR: 0.0076, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1357, pR: 0.1072, pQ: 0.0246, pS: 0.0048, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8971, pR: 0.4733, pQ: 0.2234, pS: 0.1137, pF: 0.0298, pC: 0.0085 },
  IRQ: { pG: 0.1175, pR: 0.0174, pQ: 0.0012, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1095, pR: 0.0125, pQ: 0.0008, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7139, pR: 0.3972, pQ: 0.1848, pS: 0.0684, pF: 0.0272, pC: 0.0098 },
  KOR: { pG: 0.803, pR: 0.5257, pQ: 0.2583, pS: 0.1024, pF: 0.024, pC: 0.0072 },
  KSA: { pG: 0.215, pR: 0.0968, pQ: 0.0255, pS: 0.0065, pF: 0.0006, pC: 0.0002 },
  MAR: { pG: 0.9749, pR: 0.7056, pQ: 0.4257, pS: 0.2877, pF: 0.1322, pC: 0.0602 },
  MEX: { pG: 0.9212, pR: 0.6461, pQ: 0.4167, pS: 0.2008, pF: 0.068, pC: 0.0252 },
  NED: { pG: 0.863, pR: 0.5912, pQ: 0.3757, pS: 0.1747, pF: 0.1019, pC: 0.0454 },
  NOR: { pG: 0.2714, pR: 0.0663, pQ: 0.0113, pS: 0.0032, pF: 0.0011, pC: 0.0004 },
  NZL: { pG: 0.1503, pR: 0.109, pQ: 0.0197, pS: 0.0048, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2749, pR: 0.0855, pQ: 0.0189, pS: 0.0029, pF: 0.0011, pC: 0.0002 },
  PAR: { pG: 0.366, pR: 0.1455, pQ: 0.0539, pS: 0.02, pF: 0.0028, pC: 0.0007 },
  POR: { pG: 0.8591, pR: 0.4694, pQ: 0.2547, pS: 0.0982, pF: 0.07, pC: 0.0349 },
  QAT: { pG: 0.4207, pR: 0.1811, pQ: 0.0613, pS: 0.0164, pF: 0.0012, pC: 0.0002 },
  RSA: { pG: 0.4311, pR: 0.2716, pQ: 0.0842, pS: 0.0214, pF: 0.0022, pC: 0.0005 },
  SCO: { pG: 0.6305, pR: 0.4864, pQ: 0.2102, pS: 0.0776, pF: 0.0117, pC: 0.0024 },
  SEN: { pG: 0.6774, pR: 0.28, pQ: 0.0811, pS: 0.0302, pF: 0.0172, pC: 0.0071 },
  SUI: { pG: 0.8472, pR: 0.5197, pQ: 0.3101, pS: 0.1308, pF: 0.0422, pC: 0.0145 },
  SWE: { pG: 0.3531, pR: 0.1686, pQ: 0.0584, pS: 0.0186, pF: 0.0037, pC: 0.0009 },
  TUN: { pG: 0.2863, pR: 0.1293, pQ: 0.0402, pS: 0.0115, pF: 0.0019, pC: 0.0004 },
  TUR: { pG: 0.5988, pR: 0.2494, pQ: 0.1075, pS: 0.0544, pF: 0.013, pC: 0.0039 },
  URU: { pG: 0.8224, pR: 0.4423, pQ: 0.1448, pS: 0.0696, pF: 0.0288, pC: 0.0103 },
  USA: { pG: 0.7594, pR: 0.3655, pQ: 0.185, pS: 0.1012, pF: 0.0342, pC: 0.0126 },
  UZB: { pG: 0.1833, pR: 0.029, pQ: 0.005, pS: 0.0007, pF: 0.0003, pC: 0.0 },
};
