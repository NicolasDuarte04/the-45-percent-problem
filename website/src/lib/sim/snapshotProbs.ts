// Auto-generated from M2 batch batch_20260618_220407Z on 2026-06-18T22:04:07Z.
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
  ALG: { pG: 0.4242, pR: 0.1011, pQ: 0.0172, pS: 0.0045, pF: 0.0019, pC: 0.0005 },
  ARG: { pG: 0.9507, pR: 0.6754, pQ: 0.4174, pS: 0.2649, pF: 0.217, pC: 0.1395 },
  AUS: { pG: 0.5617, pR: 0.2395, pQ: 0.1012, pS: 0.048, pF: 0.0133, pC: 0.0032 },
  AUT: { pG: 0.515, pR: 0.1394, pQ: 0.0274, pS: 0.007, pF: 0.0041, pC: 0.0009 },
  BEL: { pG: 0.9723, pR: 0.5657, pQ: 0.2747, pS: 0.1592, pF: 0.0754, pC: 0.0345 },
  BIH: { pG: 0.2641, pR: 0.104, pQ: 0.0268, pS: 0.0055, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9706, pR: 0.7067, pQ: 0.4378, pS: 0.3013, pF: 0.1419, pC: 0.0673 },
  CAN: { pG: 0.6851, pR: 0.3386, pQ: 0.1426, pS: 0.0451, pF: 0.0089, pC: 0.0018 },
  CIV: { pG: 0.7695, pR: 0.4672, pQ: 0.1854, pS: 0.0748, pF: 0.0109, pC: 0.0023 },
  COD: { pG: 0.2049, pR: 0.0386, pQ: 0.0079, pS: 0.0006, pF: 0.0003, pC: 0.0002 },
  COL: { pG: 0.7482, pR: 0.3294, pQ: 0.1354, pS: 0.0417, pF: 0.0266, pC: 0.0102 },
  CPV: { pG: 0.137, pR: 0.0587, pQ: 0.0138, pS: 0.0032, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7711, pR: 0.4116, pQ: 0.1747, pS: 0.0556, pF: 0.0356, pC: 0.0164 },
  CUW: { pG: 0.1805, pR: 0.1197, pQ: 0.0241, pS: 0.0048, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6206, pR: 0.3936, pQ: 0.1583, pS: 0.0532, pF: 0.0076, pC: 0.0018 },
  ECU: { pG: 0.867, pR: 0.4965, pQ: 0.231, pS: 0.1005, pF: 0.0293, pC: 0.0081 },
  EGY: { pG: 0.8278, pR: 0.4766, pQ: 0.2129, pS: 0.0972, pF: 0.0204, pC: 0.0044 },
  ENG: { pG: 0.9097, pR: 0.6266, pQ: 0.411, pS: 0.2005, pF: 0.1516, pC: 0.0881 },
  ESP: { pG: 0.9763, pR: 0.7756, pQ: 0.5877, pS: 0.4247, pF: 0.3119, pC: 0.1915 },
  FRA: { pG: 0.9316, pR: 0.7025, pQ: 0.443, pS: 0.2862, pF: 0.2279, pC: 0.1468 },
  GER: { pG: 0.9689, pR: 0.6312, pQ: 0.3896, pS: 0.1857, pF: 0.0919, pC: 0.0357 },
  GHA: { pG: 0.045, pR: 0.0064, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1279, pR: 0.0982, pQ: 0.0228, pS: 0.0034, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.899, pR: 0.4831, pQ: 0.2212, pS: 0.1126, pF: 0.0295, pC: 0.009 },
  IRQ: { pG: 0.118, pR: 0.0201, pQ: 0.0027, pS: 0.0007, pF: 0.0003, pC: 0.0 },
  JOR: { pG: 0.1101, pR: 0.0093, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7175, pR: 0.4084, pQ: 0.1886, pS: 0.0741, pF: 0.029, pC: 0.0098 },
  KOR: { pG: 0.8038, pR: 0.5251, pQ: 0.2591, pS: 0.1059, pF: 0.0235, pC: 0.0067 },
  KSA: { pG: 0.2094, pR: 0.0919, pQ: 0.0258, pS: 0.0078, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9706, pR: 0.7028, pQ: 0.4195, pS: 0.2842, pF: 0.1304, pC: 0.0601 },
  MEX: { pG: 0.9206, pR: 0.6501, pQ: 0.4088, pS: 0.1955, pF: 0.0689, pC: 0.0264 },
  NED: { pG: 0.8673, pR: 0.5883, pQ: 0.3788, pS: 0.1787, pF: 0.1033, pC: 0.0454 },
  NOR: { pG: 0.2861, pR: 0.0728, pQ: 0.0114, pS: 0.0023, pF: 0.0011, pC: 0.0004 },
  NZL: { pG: 0.15, pR: 0.1052, pQ: 0.019, pS: 0.003, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2742, pR: 0.0807, pQ: 0.0156, pS: 0.003, pF: 0.0012, pC: 0.0002 },
  PAR: { pG: 0.3716, pR: 0.15, pQ: 0.0577, pS: 0.0198, pF: 0.003, pC: 0.0003 },
  POR: { pG: 0.8627, pR: 0.4738, pQ: 0.2489, pS: 0.0985, pF: 0.0664, pC: 0.0337 },
  QAT: { pG: 0.4161, pR: 0.1827, pQ: 0.0592, pS: 0.014, pF: 0.0014, pC: 0.0001 },
  RSA: { pG: 0.4372, pR: 0.2789, pQ: 0.0881, pS: 0.0252, pF: 0.0029, pC: 0.0004 },
  SCO: { pG: 0.6303, pR: 0.4797, pQ: 0.2066, pS: 0.0777, pF: 0.0113, pC: 0.0031 },
  SEN: { pG: 0.6643, pR: 0.2794, pQ: 0.0805, pS: 0.0337, pF: 0.0208, pC: 0.0074 },
  SUI: { pG: 0.8525, pR: 0.527, pQ: 0.3137, pS: 0.1326, pF: 0.0419, pC: 0.0146 },
  SWE: { pG: 0.3488, pR: 0.1624, pQ: 0.053, pS: 0.0159, pF: 0.003, pC: 0.0005 },
  TUN: { pG: 0.2805, pR: 0.1263, pQ: 0.0415, pS: 0.0134, pF: 0.0019, pC: 0.0003 },
  TUR: { pG: 0.6028, pR: 0.2577, pQ: 0.1143, pS: 0.0529, pF: 0.0137, pC: 0.0041 },
  URU: { pG: 0.8282, pR: 0.4432, pQ: 0.1529, pS: 0.0732, pF: 0.0327, pC: 0.0134 },
  USA: { pG: 0.7645, pR: 0.3654, pQ: 0.1835, pS: 0.1069, pF: 0.0358, pC: 0.0109 },
  UZB: { pG: 0.1842, pR: 0.0329, pQ: 0.0061, pS: 0.0008, pF: 0.0001, pC: 0.0 },
};
