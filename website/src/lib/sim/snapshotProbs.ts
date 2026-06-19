// Auto-generated from M2 batch batch_20260619_002408Z on 2026-06-19T00:24:08Z.
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
  ALG: { pG: 0.4263, pR: 0.0932, pQ: 0.0178, pS: 0.0032, pF: 0.0013, pC: 0.0004 },
  ARG: { pG: 0.9516, pR: 0.675, pQ: 0.4133, pS: 0.273, pF: 0.2151, pC: 0.1429 },
  AUS: { pG: 0.5491, pR: 0.2282, pQ: 0.0894, pS: 0.0421, pF: 0.0092, pC: 0.0023 },
  AUT: { pG: 0.5138, pR: 0.1346, pQ: 0.0279, pS: 0.0082, pF: 0.0038, pC: 0.0008 },
  BEL: { pG: 0.9719, pR: 0.5644, pQ: 0.2782, pS: 0.1659, pF: 0.0803, pC: 0.0335 },
  BIH: { pG: 0.275, pR: 0.1069, pQ: 0.0287, pS: 0.0076, pF: 0.0006, pC: 0.0001 },
  BRA: { pG: 0.9745, pR: 0.7121, pQ: 0.4417, pS: 0.3014, pF: 0.143, pC: 0.0679 },
  CAN: { pG: 0.6741, pR: 0.3317, pQ: 0.1474, pS: 0.0441, pF: 0.0092, pC: 0.0015 },
  CIV: { pG: 0.7771, pR: 0.4771, pQ: 0.1989, pS: 0.0783, pF: 0.016, pC: 0.0031 },
  COD: { pG: 0.2115, pR: 0.0368, pQ: 0.0068, pS: 0.0002, pF: 0.0001, pC: 0.0001 },
  COL: { pG: 0.7463, pR: 0.3238, pQ: 0.1264, pS: 0.0373, pF: 0.0228, pC: 0.0089 },
  CPV: { pG: 0.1384, pR: 0.0565, pQ: 0.0121, pS: 0.0035, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.766, pR: 0.4165, pQ: 0.1708, pS: 0.0535, pF: 0.0356, pC: 0.0155 },
  CUW: { pG: 0.173, pR: 0.1142, pQ: 0.0235, pS: 0.0042, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6207, pR: 0.4033, pQ: 0.1585, pS: 0.0531, pF: 0.0081, pC: 0.0012 },
  ECU: { pG: 0.8692, pR: 0.4984, pQ: 0.2162, pS: 0.0922, pF: 0.0213, pC: 0.0058 },
  EGY: { pG: 0.8329, pR: 0.4807, pQ: 0.2167, pS: 0.0998, pF: 0.0206, pC: 0.0052 },
  ENG: { pG: 0.9017, pR: 0.6329, pQ: 0.4164, pS: 0.1952, pF: 0.1459, pC: 0.0863 },
  ESP: { pG: 0.9771, pR: 0.7767, pQ: 0.5936, pS: 0.4273, pF: 0.3056, pC: 0.1821 },
  FRA: { pG: 0.9365, pR: 0.7149, pQ: 0.4441, pS: 0.2872, pF: 0.2309, pC: 0.1468 },
  GER: { pG: 0.9694, pR: 0.6144, pQ: 0.384, pS: 0.1762, pF: 0.0912, pC: 0.0393 },
  GHA: { pG: 0.0526, pR: 0.007, pQ: 0.0009, pS: 0.0002, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1303, pR: 0.1022, pQ: 0.0233, pS: 0.0041, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8962, pR: 0.4659, pQ: 0.2112, pS: 0.1056, pF: 0.0294, pC: 0.0091 },
  IRQ: { pG: 0.119, pR: 0.0178, pQ: 0.002, pS: 0.0002, pF: 0.0001, pC: 0.0001 },
  JOR: { pG: 0.1083, pR: 0.0107, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7252, pR: 0.4133, pQ: 0.1911, pS: 0.0745, pF: 0.0315, pC: 0.0123 },
  KOR: { pG: 0.815, pR: 0.5336, pQ: 0.2628, pS: 0.1073, pF: 0.029, pC: 0.0082 },
  KSA: { pG: 0.2143, pR: 0.0977, pQ: 0.0248, pS: 0.0065, pF: 0.0006, pC: 0.0002 },
  MAR: { pG: 0.971, pR: 0.704, pQ: 0.4257, pS: 0.2907, pF: 0.1321, pC: 0.0642 },
  MEX: { pG: 0.9239, pR: 0.655, pQ: 0.4104, pS: 0.1994, pF: 0.07, pC: 0.0259 },
  NED: { pG: 0.8683, pR: 0.5971, pQ: 0.3867, pS: 0.1786, pF: 0.1004, pC: 0.0464 },
  NOR: { pG: 0.2763, pR: 0.0677, pQ: 0.0131, pS: 0.0037, pF: 0.0019, pC: 0.0004 },
  NZL: { pG: 0.1489, pR: 0.1056, pQ: 0.0191, pS: 0.0032, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2797, pR: 0.0869, pQ: 0.0187, pS: 0.0025, pF: 0.0016, pC: 0.0003 },
  PAR: { pG: 0.3666, pR: 0.1437, pQ: 0.0513, pS: 0.0199, pF: 0.0025, pC: 0.0004 },
  POR: { pG: 0.8546, pR: 0.4652, pQ: 0.2541, pS: 0.0983, pF: 0.0714, pC: 0.0345 },
  QAT: { pG: 0.4262, pR: 0.1873, pQ: 0.0608, pS: 0.0169, pF: 0.0018, pC: 0.0003 },
  RSA: { pG: 0.4231, pR: 0.2775, pQ: 0.0902, pS: 0.0235, pF: 0.0023, pC: 0.0003 },
  SCO: { pG: 0.6378, pR: 0.4908, pQ: 0.2191, pS: 0.0868, pF: 0.0119, pC: 0.0021 },
  SEN: { pG: 0.6682, pR: 0.2861, pQ: 0.0812, pS: 0.0364, pF: 0.0213, pC: 0.0084 },
  SUI: { pG: 0.842, pR: 0.5047, pQ: 0.2978, pS: 0.1254, pF: 0.0431, pC: 0.0153 },
  SWE: { pG: 0.348, pR: 0.1615, pQ: 0.0543, pS: 0.0175, pF: 0.0032, pC: 0.0006 },
  TUN: { pG: 0.2698, pR: 0.124, pQ: 0.0413, pS: 0.0114, pF: 0.002, pC: 0.0002 },
  TUR: { pG: 0.6048, pR: 0.257, pQ: 0.1097, pS: 0.0558, pF: 0.0138, pC: 0.0033 },
  URU: { pG: 0.8203, pR: 0.4525, pQ: 0.1483, pS: 0.0724, pF: 0.0325, pC: 0.0107 },
  USA: { pG: 0.7659, pR: 0.362, pQ: 0.1832, pS: 0.1048, pF: 0.0365, pC: 0.0131 },
  UZB: { pG: 0.1876, pR: 0.0309, pQ: 0.0059, pS: 0.0009, pF: 0.0002, pC: 0.0 },
};
