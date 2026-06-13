// Auto-generated from M2 batch batch_20260613_025749Z on 2026-06-13T02:57:49Z.
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
  ALG: { pG: 0.418, pR: 0.0932, pQ: 0.0172, pS: 0.0052, pF: 0.0022, pC: 0.0008 },
  ARG: { pG: 0.9538, pR: 0.6697, pQ: 0.4163, pS: 0.2661, pF: 0.2156, pC: 0.1396 },
  AUS: { pG: 0.5515, pR: 0.2287, pQ: 0.092, pS: 0.0415, pF: 0.0102, pC: 0.0023 },
  AUT: { pG: 0.5111, pR: 0.1366, pQ: 0.0285, pS: 0.0077, pF: 0.0034, pC: 0.0012 },
  BEL: { pG: 0.9741, pR: 0.5692, pQ: 0.2901, pS: 0.1704, pF: 0.0836, pC: 0.0373 },
  BIH: { pG: 0.2625, pR: 0.0985, pQ: 0.0265, pS: 0.0053, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9731, pR: 0.7193, pQ: 0.4427, pS: 0.3049, pF: 0.1451, pC: 0.0676 },
  CAN: { pG: 0.6817, pR: 0.3323, pQ: 0.1464, pS: 0.0493, pF: 0.0096, pC: 0.0018 },
  CIV: { pG: 0.7765, pR: 0.4748, pQ: 0.1962, pS: 0.0775, pF: 0.0131, pC: 0.0034 },
  COD: { pG: 0.209, pR: 0.0387, pQ: 0.0083, pS: 0.001, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.749, pR: 0.332, pQ: 0.1363, pS: 0.0423, pF: 0.0258, pC: 0.0109 },
  CPV: { pG: 0.1362, pR: 0.0571, pQ: 0.0147, pS: 0.0035, pF: 0.0005, pC: 0.0001 },
  CRO: { pG: 0.7715, pR: 0.4154, pQ: 0.1749, pS: 0.0628, pF: 0.0402, pC: 0.0181 },
  CUW: { pG: 0.1713, pR: 0.1179, pQ: 0.021, pS: 0.0036, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6259, pR: 0.4051, pQ: 0.1633, pS: 0.0497, pF: 0.0072, pC: 0.0013 },
  ECU: { pG: 0.8733, pR: 0.4967, pQ: 0.2232, pS: 0.0934, pF: 0.0255, pC: 0.0083 },
  EGY: { pG: 0.8286, pR: 0.4737, pQ: 0.2107, pS: 0.0971, pF: 0.0188, pC: 0.0037 },
  ENG: { pG: 0.9061, pR: 0.6261, pQ: 0.4099, pS: 0.1977, pF: 0.1479, pC: 0.0872 },
  ESP: { pG: 0.9784, pR: 0.7735, pQ: 0.584, pS: 0.4164, pF: 0.3022, pC: 0.1835 },
  FRA: { pG: 0.9331, pR: 0.7063, pQ: 0.4336, pS: 0.2779, pF: 0.2238, pC: 0.1434 },
  GER: { pG: 0.969, pR: 0.6243, pQ: 0.3801, pS: 0.1782, pF: 0.0876, pC: 0.034 },
  GHA: { pG: 0.0506, pR: 0.0069, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1325, pR: 0.1052, pQ: 0.0231, pS: 0.003, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.898, pR: 0.4798, pQ: 0.2139, pS: 0.1105, pF: 0.0294, pC: 0.0106 },
  IRQ: { pG: 0.1163, pR: 0.018, pQ: 0.0022, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1171, pR: 0.0104, pQ: 0.0009, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7165, pR: 0.4049, pQ: 0.1959, pS: 0.0783, pF: 0.0337, pC: 0.0116 },
  KOR: { pG: 0.8059, pR: 0.5269, pQ: 0.2605, pS: 0.1021, pF: 0.026, pC: 0.0075 },
  KSA: { pG: 0.2174, pR: 0.0975, pQ: 0.0259, pS: 0.007, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9722, pR: 0.711, pQ: 0.4298, pS: 0.2895, pF: 0.1325, pC: 0.0613 },
  MEX: { pG: 0.9153, pR: 0.6548, pQ: 0.4206, pS: 0.2062, pF: 0.0711, pC: 0.0286 },
  NED: { pG: 0.8635, pR: 0.5958, pQ: 0.3799, pS: 0.1814, pF: 0.1018, pC: 0.047 },
  NOR: { pG: 0.2852, pR: 0.0746, pQ: 0.0138, pS: 0.0033, pF: 0.0016, pC: 0.0005 },
  NZL: { pG: 0.1486, pR: 0.1051, pQ: 0.0194, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2718, pR: 0.0805, pQ: 0.0184, pS: 0.0031, pF: 0.0016, pC: 0.0006 },
  PAR: { pG: 0.372, pR: 0.1428, pQ: 0.0485, pS: 0.0202, pF: 0.003, pC: 0.0003 },
  POR: { pG: 0.8535, pR: 0.4678, pQ: 0.2463, pS: 0.0982, pF: 0.0663, pC: 0.0318 },
  QAT: { pG: 0.42, pR: 0.1822, pQ: 0.0586, pS: 0.0153, pF: 0.0023, pC: 0.0001 },
  RSA: { pG: 0.4386, pR: 0.2871, pQ: 0.0948, pS: 0.0256, pF: 0.0029, pC: 0.0004 },
  SCO: { pG: 0.6312, pR: 0.4795, pQ: 0.208, pS: 0.0801, pF: 0.0102, pC: 0.002 },
  SEN: { pG: 0.6654, pR: 0.2912, pQ: 0.0875, pS: 0.034, pF: 0.0211, pC: 0.0082 },
  SUI: { pG: 0.8501, pR: 0.5131, pQ: 0.2938, pS: 0.1262, pF: 0.0413, pC: 0.014 },
  SWE: { pG: 0.3503, pR: 0.1604, pQ: 0.0562, pS: 0.0165, pF: 0.0033, pC: 0.0003 },
  TUN: { pG: 0.2796, pR: 0.1252, pQ: 0.0367, pS: 0.0122, pF: 0.0019, pC: 0.0004 },
  TUR: { pG: 0.6029, pR: 0.2583, pQ: 0.1105, pS: 0.0532, pF: 0.0161, pC: 0.0046 },
  URU: { pG: 0.8187, pR: 0.4441, pQ: 0.1521, pS: 0.0748, pF: 0.0333, pC: 0.0131 },
  USA: { pG: 0.7646, pR: 0.3552, pQ: 0.1809, pS: 0.1033, pF: 0.0368, pC: 0.0124 },
  UZB: { pG: 0.1885, pR: 0.0326, pQ: 0.0056, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
