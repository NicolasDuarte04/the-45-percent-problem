// Auto-generated from M2 batch batch_20260620_154453Z on 2026-06-20T15:44:53Z.
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
  ALG: { pG: 0.429, pR: 0.1059, pQ: 0.0198, pS: 0.0044, pF: 0.002, pC: 0.0007 },
  ARG: { pG: 0.9523, pR: 0.6736, pQ: 0.4182, pS: 0.2713, pF: 0.219, pC: 0.1422 },
  AUS: { pG: 0.572, pR: 0.2347, pQ: 0.0984, pS: 0.0481, pF: 0.0115, pC: 0.0028 },
  AUT: { pG: 0.5106, pR: 0.1336, pQ: 0.0292, pS: 0.008, pF: 0.0046, pC: 0.0013 },
  BEL: { pG: 0.9746, pR: 0.5683, pQ: 0.2866, pS: 0.1728, pF: 0.0846, pC: 0.0365 },
  BIH: { pG: 0.2646, pR: 0.1067, pQ: 0.0275, pS: 0.0056, pF: 0.0003, pC: 0.0001 },
  BRA: { pG: 0.9733, pR: 0.7136, pQ: 0.4439, pS: 0.3119, pF: 0.1511, pC: 0.0695 },
  CAN: { pG: 0.685, pR: 0.3399, pQ: 0.1462, pS: 0.0437, pF: 0.01, pC: 0.0018 },
  CIV: { pG: 0.7694, pR: 0.471, pQ: 0.1923, pS: 0.0766, pF: 0.0118, pC: 0.0021 },
  COD: { pG: 0.2042, pR: 0.0359, pQ: 0.0068, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.75, pR: 0.3315, pQ: 0.1325, pS: 0.0409, pF: 0.0245, pC: 0.0099 },
  CPV: { pG: 0.1308, pR: 0.0592, pQ: 0.0115, pS: 0.003, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7615, pR: 0.4059, pQ: 0.1749, pS: 0.0602, pF: 0.037, pC: 0.0168 },
  CUW: { pG: 0.1774, pR: 0.1175, pQ: 0.0263, pS: 0.0053, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6275, pR: 0.4083, pQ: 0.1618, pS: 0.0523, pF: 0.0079, pC: 0.0019 },
  ECU: { pG: 0.8676, pR: 0.4939, pQ: 0.2272, pS: 0.0972, pF: 0.0245, pC: 0.0063 },
  EGY: { pG: 0.8296, pR: 0.4751, pQ: 0.2081, pS: 0.0943, pF: 0.0195, pC: 0.0045 },
  ENG: { pG: 0.9013, pR: 0.6155, pQ: 0.4021, pS: 0.1898, pF: 0.1445, pC: 0.0822 },
  ESP: { pG: 0.979, pR: 0.7798, pQ: 0.5866, pS: 0.427, pF: 0.306, pC: 0.1885 },
  FRA: { pG: 0.9358, pR: 0.7102, pQ: 0.4357, pS: 0.2811, pF: 0.2294, pC: 0.1508 },
  GER: { pG: 0.9724, pR: 0.6316, pQ: 0.3894, pS: 0.1813, pF: 0.0867, pC: 0.0362 },
  GHA: { pG: 0.0496, pR: 0.0052, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1305, pR: 0.0999, pQ: 0.022, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8934, pR: 0.4713, pQ: 0.2161, pS: 0.1089, pF: 0.0303, pC: 0.0078 },
  IRQ: { pG: 0.1182, pR: 0.0163, pQ: 0.0015, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1081, pR: 0.012, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7118, pR: 0.4035, pQ: 0.1846, pS: 0.0721, pF: 0.0291, pC: 0.0097 },
  KOR: { pG: 0.7983, pR: 0.5082, pQ: 0.2474, pS: 0.1002, pF: 0.0224, pC: 0.0062 },
  KSA: { pG: 0.216, pR: 0.0967, pQ: 0.0244, pS: 0.0063, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9697, pR: 0.7106, pQ: 0.4237, pS: 0.2875, pF: 0.1309, pC: 0.0595 },
  MEX: { pG: 0.9207, pR: 0.6578, pQ: 0.4197, pS: 0.2026, pF: 0.0718, pC: 0.0269 },
  NED: { pG: 0.8671, pR: 0.5919, pQ: 0.3876, pS: 0.1769, pF: 0.1003, pC: 0.0454 },
  NOR: { pG: 0.2791, pR: 0.0697, pQ: 0.0103, pS: 0.0026, pF: 0.0012, pC: 0.0004 },
  NZL: { pG: 0.1515, pR: 0.1092, pQ: 0.0211, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2876, pR: 0.0881, pQ: 0.0198, pS: 0.0038, pF: 0.0014, pC: 0.0008 },
  PAR: { pG: 0.3671, pR: 0.1413, pQ: 0.0534, pS: 0.0204, pF: 0.0032, pC: 0.0007 },
  POR: { pG: 0.8615, pR: 0.4833, pQ: 0.2581, pS: 0.103, pF: 0.0707, pC: 0.0356 },
  QAT: { pG: 0.4182, pR: 0.1808, pQ: 0.0571, pS: 0.0135, pF: 0.0014, pC: 0.0001 },
  RSA: { pG: 0.4342, pR: 0.2789, pQ: 0.0918, pS: 0.0236, pF: 0.0013, pC: 0.0002 },
  SCO: { pG: 0.6287, pR: 0.4786, pQ: 0.2043, pS: 0.0772, pF: 0.0095, pC: 0.0022 },
  SEN: { pG: 0.6669, pR: 0.2787, pQ: 0.0846, pS: 0.0338, pF: 0.021, pC: 0.0086 },
  SUI: { pG: 0.8515, pR: 0.5194, pQ: 0.3041, pS: 0.121, pF: 0.0431, pC: 0.0137 },
  SWE: { pG: 0.347, pR: 0.1607, pQ: 0.0513, pS: 0.0166, pF: 0.0027, pC: 0.0009 },
  TUN: { pG: 0.2873, pR: 0.1299, pQ: 0.0381, pS: 0.0098, pF: 0.0015, pC: 0.0003 },
  TUR: { pG: 0.6014, pR: 0.2578, pQ: 0.1153, pS: 0.058, pF: 0.0151, pC: 0.004 },
  URU: { pG: 0.8251, pR: 0.4404, pQ: 0.1488, pS: 0.0715, pF: 0.0308, pC: 0.0112 },
  USA: { pG: 0.7573, pR: 0.3635, pQ: 0.1834, pS: 0.1068, pF: 0.0361, pC: 0.0117 },
  UZB: { pG: 0.1843, pR: 0.0346, pQ: 0.0056, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
