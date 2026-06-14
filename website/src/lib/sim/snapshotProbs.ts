// Auto-generated from M2 batch batch_20260614_081259Z on 2026-06-14T08:12:59Z.
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
  ALG: { pG: 0.4211, pR: 0.0996, pQ: 0.0171, pS: 0.0048, pF: 0.0018, pC: 0.0006 },
  ARG: { pG: 0.9537, pR: 0.6771, pQ: 0.416, pS: 0.2693, pF: 0.2188, pC: 0.1427 },
  AUS: { pG: 0.5653, pR: 0.2364, pQ: 0.0967, pS: 0.0436, pF: 0.0105, pC: 0.0027 },
  AUT: { pG: 0.5121, pR: 0.1377, pQ: 0.0269, pS: 0.0067, pF: 0.0031, pC: 0.0007 },
  BEL: { pG: 0.9759, pR: 0.5678, pQ: 0.2851, pS: 0.1692, pF: 0.0823, pC: 0.0336 },
  BIH: { pG: 0.2731, pR: 0.1076, pQ: 0.0294, pS: 0.0071, pF: 0.0006, pC: 0.0002 },
  BRA: { pG: 0.974, pR: 0.7071, pQ: 0.4378, pS: 0.3011, pF: 0.1358, pC: 0.0618 },
  CAN: { pG: 0.6784, pR: 0.3346, pQ: 0.1454, pS: 0.0482, pF: 0.0126, pC: 0.0026 },
  CIV: { pG: 0.77, pR: 0.4726, pQ: 0.1929, pS: 0.0777, pF: 0.013, pC: 0.0035 },
  COD: { pG: 0.2139, pR: 0.0393, pQ: 0.0073, pS: 0.0008, pF: 0.0003, pC: 0.0001 },
  COL: { pG: 0.7469, pR: 0.3275, pQ: 0.1313, pS: 0.0396, pF: 0.0235, pC: 0.0102 },
  CPV: { pG: 0.1297, pR: 0.0573, pQ: 0.0129, pS: 0.004, pF: 0.0005, pC: 0.0 },
  CRO: { pG: 0.7635, pR: 0.4098, pQ: 0.1758, pS: 0.0605, pF: 0.0389, pC: 0.0159 },
  CUW: { pG: 0.1745, pR: 0.1183, pQ: 0.0238, pS: 0.0033, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.626, pR: 0.4114, pQ: 0.166, pS: 0.0576, pF: 0.0085, pC: 0.0014 },
  ECU: { pG: 0.8729, pR: 0.4991, pQ: 0.2254, pS: 0.0928, pF: 0.025, pC: 0.0054 },
  EGY: { pG: 0.8286, pR: 0.4779, pQ: 0.2204, pS: 0.1034, pF: 0.0223, pC: 0.0051 },
  ENG: { pG: 0.9052, pR: 0.6252, pQ: 0.4132, pS: 0.1908, pF: 0.1442, pC: 0.0822 },
  ESP: { pG: 0.9747, pR: 0.7714, pQ: 0.5843, pS: 0.4245, pF: 0.3056, pC: 0.19 },
  FRA: { pG: 0.933, pR: 0.708, pQ: 0.4394, pS: 0.2818, pF: 0.2268, pC: 0.1501 },
  GER: { pG: 0.9726, pR: 0.6331, pQ: 0.3896, pS: 0.1803, pF: 0.0944, pC: 0.0408 },
  GHA: { pG: 0.0494, pR: 0.0058, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1327, pR: 0.1033, pQ: 0.023, pS: 0.0033, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8984, pR: 0.4765, pQ: 0.2163, pS: 0.1135, pF: 0.0281, pC: 0.0074 },
  IRQ: { pG: 0.1249, pR: 0.0189, pQ: 0.0017, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1131, pR: 0.0097, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7209, pR: 0.4004, pQ: 0.1894, pS: 0.0716, pF: 0.0274, pC: 0.0081 },
  KOR: { pG: 0.8169, pR: 0.5351, pQ: 0.2564, pS: 0.1043, pF: 0.0265, pC: 0.007 },
  KSA: { pG: 0.2119, pR: 0.0952, pQ: 0.0236, pS: 0.0078, pF: 0.0007, pC: 0.0 },
  MAR: { pG: 0.9704, pR: 0.7004, pQ: 0.4213, pS: 0.2906, pF: 0.1343, pC: 0.06 },
  MEX: { pG: 0.9155, pR: 0.6455, pQ: 0.4176, pS: 0.1964, pF: 0.0706, pC: 0.0236 },
  NED: { pG: 0.8612, pR: 0.5931, pQ: 0.3766, pS: 0.1745, pF: 0.1005, pC: 0.0482 },
  NOR: { pG: 0.2777, pR: 0.0722, pQ: 0.0122, pS: 0.0024, pF: 0.0008, pC: 0.0002 },
  NZL: { pG: 0.1506, pR: 0.1083, pQ: 0.0217, pS: 0.003, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2819, pR: 0.0849, pQ: 0.0169, pS: 0.0032, pF: 0.0012, pC: 0.0004 },
  PAR: { pG: 0.3711, pR: 0.145, pQ: 0.0586, pS: 0.0218, pF: 0.0037, pC: 0.0009 },
  POR: { pG: 0.8543, pR: 0.4731, pQ: 0.2506, pS: 0.1024, pF: 0.0722, pC: 0.0397 },
  QAT: { pG: 0.4217, pR: 0.1841, pQ: 0.0578, pS: 0.0135, pF: 0.0021, pC: 0.0002 },
  RSA: { pG: 0.4244, pR: 0.2768, pQ: 0.0821, pS: 0.0219, pF: 0.0017, pC: 0.0004 },
  SCO: { pG: 0.6234, pR: 0.4784, pQ: 0.2073, pS: 0.0776, pF: 0.0132, pC: 0.003 },
  SEN: { pG: 0.6644, pR: 0.2768, pQ: 0.086, pS: 0.0368, pF: 0.0214, pC: 0.0082 },
  SUI: { pG: 0.844, pR: 0.5049, pQ: 0.3021, pS: 0.1256, pF: 0.0412, pC: 0.0144 },
  SWE: { pG: 0.3488, pR: 0.1598, pQ: 0.0509, pS: 0.0161, pF: 0.0032, pC: 0.0005 },
  TUN: { pG: 0.2791, pR: 0.1236, pQ: 0.0392, pS: 0.0123, pF: 0.002, pC: 0.0006 },
  TUR: { pG: 0.5989, pR: 0.2541, pQ: 0.1117, pS: 0.0561, pF: 0.0157, pC: 0.0038 },
  URU: { pG: 0.8302, pR: 0.4456, pQ: 0.1479, pS: 0.069, pF: 0.0278, pC: 0.0093 },
  USA: { pG: 0.7642, pR: 0.3753, pQ: 0.1868, pS: 0.1083, pF: 0.0367, pC: 0.0144 },
  UZB: { pG: 0.1849, pR: 0.0344, pQ: 0.0045, pS: 0.0008, pF: 0.0001, pC: 0.0001 },
};
