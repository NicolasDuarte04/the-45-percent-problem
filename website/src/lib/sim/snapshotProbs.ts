// Auto-generated from M2 batch batch_20260618_122238Z on 2026-06-18T12:22:38Z.
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
  ALG: { pG: 0.4339, pR: 0.101, pQ: 0.018, pS: 0.0037, pF: 0.0019, pC: 0.0008 },
  ARG: { pG: 0.9516, pR: 0.6746, pQ: 0.4197, pS: 0.2734, pF: 0.2213, pC: 0.141 },
  AUS: { pG: 0.5498, pR: 0.2269, pQ: 0.0996, pS: 0.0486, pF: 0.012, pC: 0.003 },
  AUT: { pG: 0.504, pR: 0.1394, pQ: 0.0305, pS: 0.0085, pF: 0.0042, pC: 0.0012 },
  BEL: { pG: 0.9765, pR: 0.5665, pQ: 0.2888, pS: 0.1686, pF: 0.0837, pC: 0.0354 },
  BIH: { pG: 0.2747, pR: 0.11, pQ: 0.0283, pS: 0.0054, pF: 0.0006, pC: 0.0 },
  BRA: { pG: 0.9739, pR: 0.7099, pQ: 0.4293, pS: 0.2989, pF: 0.1396, pC: 0.0666 },
  CAN: { pG: 0.6789, pR: 0.3353, pQ: 0.1427, pS: 0.0464, pF: 0.0097, pC: 0.0025 },
  CIV: { pG: 0.7677, pR: 0.4766, pQ: 0.1974, pS: 0.0778, pF: 0.0144, pC: 0.0041 },
  COD: { pG: 0.2108, pR: 0.04, pQ: 0.0077, pS: 0.0006, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7423, pR: 0.3327, pQ: 0.1366, pS: 0.0419, pF: 0.0253, pC: 0.0112 },
  CPV: { pG: 0.1336, pR: 0.0561, pQ: 0.0124, pS: 0.0032, pF: 0.0004, pC: 0.0002 },
  CRO: { pG: 0.7682, pR: 0.4088, pQ: 0.1643, pS: 0.0554, pF: 0.0357, pC: 0.0149 },
  CUW: { pG: 0.1809, pR: 0.1192, pQ: 0.0243, pS: 0.0042, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6295, pR: 0.4115, pQ: 0.165, pS: 0.0582, pF: 0.0081, pC: 0.0024 },
  ECU: { pG: 0.8618, pR: 0.4936, pQ: 0.217, pS: 0.0923, pF: 0.0257, pC: 0.0064 },
  EGY: { pG: 0.8306, pR: 0.4769, pQ: 0.2038, pS: 0.0933, pF: 0.0199, pC: 0.0064 },
  ENG: { pG: 0.9071, pR: 0.6295, pQ: 0.416, pS: 0.1937, pF: 0.1475, pC: 0.0832 },
  ESP: { pG: 0.9775, pR: 0.7783, pQ: 0.5922, pS: 0.4295, pF: 0.311, pC: 0.1903 },
  FRA: { pG: 0.9377, pR: 0.7037, pQ: 0.4326, pS: 0.2818, pF: 0.2281, pC: 0.1475 },
  GER: { pG: 0.9708, pR: 0.6272, pQ: 0.3924, pS: 0.1866, pF: 0.095, pC: 0.0381 },
  GHA: { pG: 0.0496, pR: 0.007, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1329, pR: 0.1071, pQ: 0.0207, pS: 0.0028, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8945, pR: 0.4761, pQ: 0.2118, pS: 0.1056, pF: 0.0277, pC: 0.0091 },
  IRQ: { pG: 0.118, pR: 0.0175, pQ: 0.0033, pS: 0.0006, pF: 0.0004, pC: 0.0 },
  JOR: { pG: 0.1105, pR: 0.0096, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7194, pR: 0.4105, pQ: 0.1912, pS: 0.0725, pF: 0.0291, pC: 0.0118 },
  KOR: { pG: 0.8061, pR: 0.5285, pQ: 0.2559, pS: 0.1062, pF: 0.0239, pC: 0.0067 },
  KSA: { pG: 0.2159, pR: 0.0967, pQ: 0.0234, pS: 0.0076, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9743, pR: 0.7054, pQ: 0.4321, pS: 0.2908, pF: 0.1302, pC: 0.0619 },
  MEX: { pG: 0.9154, pR: 0.6476, pQ: 0.4168, pS: 0.2013, pF: 0.0691, pC: 0.0225 },
  NED: { pG: 0.8626, pR: 0.5887, pQ: 0.3835, pS: 0.1739, pF: 0.0989, pC: 0.0437 },
  NOR: { pG: 0.276, pR: 0.0686, pQ: 0.0107, pS: 0.0028, pF: 0.0011, pC: 0.0001 },
  NZL: { pG: 0.146, pR: 0.1062, pQ: 0.0206, pS: 0.0037, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2751, pR: 0.0847, pQ: 0.0194, pS: 0.0029, pF: 0.0012, pC: 0.0004 },
  PAR: { pG: 0.3789, pR: 0.1441, pQ: 0.0523, pS: 0.0191, pF: 0.003, pC: 0.0002 },
  POR: { pG: 0.8518, pR: 0.4649, pQ: 0.2489, pS: 0.101, pF: 0.0714, pC: 0.0354 },
  QAT: { pG: 0.423, pR: 0.1828, pQ: 0.063, pS: 0.0145, pF: 0.0015, pC: 0.0003 },
  RSA: { pG: 0.4268, pR: 0.2748, pQ: 0.0893, pS: 0.025, pF: 0.0023, pC: 0.0005 },
  SCO: { pG: 0.6259, pR: 0.4809, pQ: 0.209, pS: 0.0786, pF: 0.0095, pC: 0.0016 },
  SEN: { pG: 0.6683, pR: 0.2856, pQ: 0.085, pS: 0.033, pF: 0.0186, pC: 0.0075 },
  SUI: { pG: 0.8456, pR: 0.5095, pQ: 0.2979, pS: 0.1224, pF: 0.0388, pC: 0.0126 },
  SWE: { pG: 0.3464, pR: 0.1574, pQ: 0.0549, pS: 0.0173, pF: 0.0028, pC: 0.0005 },
  TUN: { pG: 0.2904, pR: 0.1268, pQ: 0.039, pS: 0.0122, pF: 0.0017, pC: 0.0004 },
  TUR: { pG: 0.6054, pR: 0.2594, pQ: 0.1132, pS: 0.0549, pF: 0.0136, pC: 0.0038 },
  URU: { pG: 0.8254, pR: 0.4432, pQ: 0.1473, pS: 0.071, pF: 0.0325, pC: 0.0139 },
  USA: { pG: 0.7589, pR: 0.3663, pQ: 0.1849, pS: 0.1076, pF: 0.037, pC: 0.0118 },
  UZB: { pG: 0.1951, pR: 0.0324, pQ: 0.0069, pS: 0.0007, pF: 0.0005, pC: 0.0 },
};
