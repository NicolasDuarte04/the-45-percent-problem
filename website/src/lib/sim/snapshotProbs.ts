// Auto-generated from M2 batch batch_20260613_192018Z on 2026-06-13T19:20:18Z.
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
  ALG: { pG: 0.4252, pR: 0.1027, pQ: 0.0166, pS: 0.0033, pF: 0.0019, pC: 0.0006 },
  ARG: { pG: 0.9551, pR: 0.6792, pQ: 0.4202, pS: 0.2685, pF: 0.2147, pC: 0.1377 },
  AUS: { pG: 0.5467, pR: 0.2301, pQ: 0.1007, pS: 0.0499, pF: 0.012, pC: 0.0034 },
  AUT: { pG: 0.5116, pR: 0.1398, pQ: 0.0281, pS: 0.0074, pF: 0.0032, pC: 0.0012 },
  BEL: { pG: 0.9712, pR: 0.5581, pQ: 0.2824, pS: 0.1674, pF: 0.0797, pC: 0.0334 },
  BIH: { pG: 0.2684, pR: 0.1033, pQ: 0.0252, pS: 0.0046, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9773, pR: 0.7152, pQ: 0.443, pS: 0.3061, pF: 0.1446, pC: 0.0662 },
  CAN: { pG: 0.6836, pR: 0.3413, pQ: 0.1437, pS: 0.0493, pF: 0.0107, pC: 0.0025 },
  CIV: { pG: 0.7748, pR: 0.4695, pQ: 0.1878, pS: 0.073, pF: 0.0118, pC: 0.0023 },
  COD: { pG: 0.2039, pR: 0.0382, pQ: 0.0069, pS: 0.0004, pF: 0.0003, pC: 0.0 },
  COL: { pG: 0.747, pR: 0.3327, pQ: 0.1361, pS: 0.0431, pF: 0.0268, pC: 0.0094 },
  CPV: { pG: 0.1437, pR: 0.0622, pQ: 0.0135, pS: 0.0029, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7663, pR: 0.4134, pQ: 0.1714, pS: 0.06, pF: 0.0402, pC: 0.0201 },
  CUW: { pG: 0.1846, pR: 0.1254, pQ: 0.0243, pS: 0.0039, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6233, pR: 0.4034, pQ: 0.1604, pS: 0.0553, pF: 0.0093, pC: 0.0012 },
  ECU: { pG: 0.8616, pR: 0.4926, pQ: 0.2219, pS: 0.0912, pF: 0.0201, pC: 0.0051 },
  EGY: { pG: 0.8216, pR: 0.4698, pQ: 0.2045, pS: 0.0949, pF: 0.0189, pC: 0.0055 },
  ENG: { pG: 0.9042, pR: 0.6252, pQ: 0.4117, pS: 0.1977, pF: 0.1512, pC: 0.0858 },
  ESP: { pG: 0.974, pR: 0.7745, pQ: 0.5906, pS: 0.4287, pF: 0.3142, pC: 0.1922 },
  FRA: { pG: 0.9334, pR: 0.6995, pQ: 0.4335, pS: 0.2811, pF: 0.2281, pC: 0.1459 },
  GER: { pG: 0.9727, pR: 0.6208, pQ: 0.3836, pS: 0.1806, pF: 0.0905, pC: 0.0394 },
  GHA: { pG: 0.049, pR: 0.0056, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1243, pR: 0.0981, pQ: 0.0196, pS: 0.0036, pF: 0.0002, pC: 0.0001 },
  IRN: { pG: 0.8958, pR: 0.4728, pQ: 0.2187, pS: 0.1082, pF: 0.0278, pC: 0.007 },
  IRQ: { pG: 0.1183, pR: 0.017, pQ: 0.0013, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1081, pR: 0.0103, pQ: 0.0009, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7153, pR: 0.4062, pQ: 0.1911, pS: 0.0728, pF: 0.0298, pC: 0.0114 },
  KOR: { pG: 0.8082, pR: 0.5225, pQ: 0.2471, pS: 0.0963, pF: 0.0213, pC: 0.0068 },
  KSA: { pG: 0.2137, pR: 0.0951, pQ: 0.0275, pS: 0.0081, pF: 0.0014, pC: 0.0002 },
  MAR: { pG: 0.9722, pR: 0.6988, pQ: 0.425, pS: 0.2866, pF: 0.1303, pC: 0.0607 },
  MEX: { pG: 0.9205, pR: 0.6565, pQ: 0.4293, pS: 0.2058, pF: 0.0715, pC: 0.0261 },
  NED: { pG: 0.8714, pR: 0.5983, pQ: 0.3852, pS: 0.1823, pF: 0.1068, pC: 0.0489 },
  NOR: { pG: 0.2845, pR: 0.0717, pQ: 0.0127, pS: 0.0032, pF: 0.0017, pC: 0.0004 },
  NZL: { pG: 0.1527, pR: 0.1096, pQ: 0.0203, pS: 0.003, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2805, pR: 0.0815, pQ: 0.0175, pS: 0.003, pF: 0.0013, pC: 0.0004 },
  PAR: { pG: 0.3751, pR: 0.1474, pQ: 0.055, pS: 0.0214, pF: 0.003, pC: 0.0003 },
  POR: { pG: 0.854, pR: 0.4709, pQ: 0.2509, pS: 0.0972, pF: 0.0662, pC: 0.0336 },
  QAT: { pG: 0.4207, pR: 0.182, pQ: 0.0588, pS: 0.0152, pF: 0.0019, pC: 0.0004 },
  RSA: { pG: 0.4311, pR: 0.2811, pQ: 0.0907, pS: 0.0266, pF: 0.002, pC: 0.0003 },
  SCO: { pG: 0.6333, pR: 0.4802, pQ: 0.2101, pS: 0.0798, pF: 0.0101, pC: 0.0022 },
  SEN: { pG: 0.6638, pR: 0.2798, pQ: 0.0867, pS: 0.034, pF: 0.0214, pC: 0.0079 },
  SUI: { pG: 0.8442, pR: 0.5099, pQ: 0.2996, pS: 0.1226, pF: 0.0397, pC: 0.014 },
  SWE: { pG: 0.3411, pR: 0.1579, pQ: 0.0572, pS: 0.0181, pF: 0.0028, pC: 0.0003 },
  TUN: { pG: 0.2785, pR: 0.1293, pQ: 0.0387, pS: 0.0123, pF: 0.0022, pC: 0.0006 },
  TUR: { pG: 0.6089, pR: 0.2604, pQ: 0.1073, pS: 0.0545, pF: 0.0142, pC: 0.004 },
  URU: { pG: 0.8273, pR: 0.4579, pQ: 0.1527, pS: 0.0704, pF: 0.03, pC: 0.0094 },
  USA: { pG: 0.7622, pR: 0.3698, pQ: 0.1845, pS: 0.1046, pF: 0.0352, pC: 0.0131 },
  UZB: { pG: 0.1951, pR: 0.0325, pQ: 0.005, pS: 0.0007, pF: 0.0001, pC: 0.0 },
};
