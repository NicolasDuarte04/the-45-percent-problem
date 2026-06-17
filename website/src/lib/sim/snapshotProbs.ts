// Auto-generated from M2 batch batch_20260617_033918Z on 2026-06-17T03:39:18Z.
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
  ALG: { pG: 0.4173, pR: 0.1066, pQ: 0.0171, pS: 0.0046, pF: 0.0025, pC: 0.0002 },
  ARG: { pG: 0.9552, pR: 0.6771, pQ: 0.4218, pS: 0.2692, pF: 0.2173, pC: 0.1371 },
  AUS: { pG: 0.5546, pR: 0.2285, pQ: 0.0971, pS: 0.0479, pF: 0.0096, pC: 0.0025 },
  AUT: { pG: 0.5147, pR: 0.1405, pQ: 0.0274, pS: 0.0078, pF: 0.0033, pC: 0.0011 },
  BEL: { pG: 0.9722, pR: 0.5661, pQ: 0.2868, pS: 0.1741, pF: 0.0852, pC: 0.0356 },
  BIH: { pG: 0.2658, pR: 0.1018, pQ: 0.0269, pS: 0.0048, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9768, pR: 0.7159, pQ: 0.436, pS: 0.2985, pF: 0.143, pC: 0.0674 },
  CAN: { pG: 0.6791, pR: 0.3346, pQ: 0.1427, pS: 0.049, pF: 0.0107, pC: 0.0029 },
  CIV: { pG: 0.7696, pR: 0.4694, pQ: 0.1951, pS: 0.0799, pF: 0.0131, pC: 0.0026 },
  COD: { pG: 0.2071, pR: 0.0382, pQ: 0.0062, pS: 0.0011, pF: 0.0006, pC: 0.0002 },
  COL: { pG: 0.7518, pR: 0.3371, pQ: 0.1369, pS: 0.0431, pF: 0.0256, pC: 0.0101 },
  CPV: { pG: 0.1323, pR: 0.0537, pQ: 0.0133, pS: 0.0033, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7628, pR: 0.4133, pQ: 0.1776, pS: 0.0573, pF: 0.0368, pC: 0.0163 },
  CUW: { pG: 0.1788, pR: 0.1229, pQ: 0.0233, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6258, pR: 0.4105, pQ: 0.1639, pS: 0.0557, pF: 0.0072, pC: 0.0015 },
  ECU: { pG: 0.8677, pR: 0.4922, pQ: 0.2142, pS: 0.0908, pF: 0.0244, pC: 0.0061 },
  EGY: { pG: 0.8332, pR: 0.4716, pQ: 0.2094, pS: 0.0959, pF: 0.0185, pC: 0.0051 },
  ENG: { pG: 0.9098, pR: 0.6211, pQ: 0.4053, pS: 0.194, pF: 0.1489, pC: 0.0845 },
  ESP: { pG: 0.976, pR: 0.7737, pQ: 0.5789, pS: 0.4158, pF: 0.3017, pC: 0.1882 },
  FRA: { pG: 0.9324, pR: 0.7034, pQ: 0.437, pS: 0.2818, pF: 0.2273, pC: 0.1442 },
  GER: { pG: 0.972, pR: 0.6354, pQ: 0.3943, pS: 0.1813, pF: 0.0902, pC: 0.0376 },
  GHA: { pG: 0.0491, pR: 0.0064, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1297, pR: 0.1019, pQ: 0.0236, pS: 0.0034, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8924, pR: 0.4845, pQ: 0.2232, pS: 0.1132, pF: 0.029, pC: 0.0087 },
  IRQ: { pG: 0.1189, pR: 0.0173, pQ: 0.0015, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1128, pR: 0.0098, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7096, pR: 0.4046, pQ: 0.1874, pS: 0.0751, pF: 0.0292, pC: 0.0102 },
  KOR: { pG: 0.8073, pR: 0.5276, pQ: 0.2609, pS: 0.1056, pF: 0.0268, pC: 0.0067 },
  KSA: { pG: 0.2153, pR: 0.0957, pQ: 0.0255, pS: 0.0067, pF: 0.0003, pC: 0.0 },
  MAR: { pG: 0.9727, pR: 0.7011, pQ: 0.4258, pS: 0.2884, pF: 0.1299, pC: 0.0621 },
  MEX: { pG: 0.9207, pR: 0.6541, pQ: 0.4215, pS: 0.2016, pF: 0.0729, pC: 0.0281 },
  NED: { pG: 0.8718, pR: 0.5892, pQ: 0.3822, pS: 0.1757, pF: 0.1014, pC: 0.0483 },
  NOR: { pG: 0.2782, pR: 0.0672, pQ: 0.0126, pS: 0.0027, pF: 0.0011, pC: 0.0001 },
  NZL: { pG: 0.152, pR: 0.1098, pQ: 0.0211, pS: 0.0042, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2783, pR: 0.0839, pQ: 0.0189, pS: 0.0042, pF: 0.002, pC: 0.0002 },
  PAR: { pG: 0.3644, pR: 0.1406, pQ: 0.0513, pS: 0.0185, pF: 0.0029, pC: 0.0013 },
  POR: { pG: 0.8549, pR: 0.4684, pQ: 0.2497, pS: 0.0996, pF: 0.0679, pC: 0.0325 },
  QAT: { pG: 0.4205, pR: 0.1816, pQ: 0.0581, pS: 0.0151, pF: 0.0017, pC: 0.0002 },
  RSA: { pG: 0.432, pR: 0.2819, pQ: 0.0907, pS: 0.0254, pF: 0.0029, pC: 0.0005 },
  SCO: { pG: 0.6313, pR: 0.4791, pQ: 0.2026, pS: 0.0735, pF: 0.01, pC: 0.0016 },
  SEN: { pG: 0.6705, pR: 0.2781, pQ: 0.0821, pS: 0.0339, pF: 0.0224, pC: 0.0096 },
  SUI: { pG: 0.8488, pR: 0.5079, pQ: 0.3004, pS: 0.1247, pF: 0.0424, pC: 0.0142 },
  SWE: { pG: 0.3486, pR: 0.1632, pQ: 0.0563, pS: 0.0184, pF: 0.0033, pC: 0.0006 },
  TUN: { pG: 0.2819, pR: 0.1231, pQ: 0.0362, pS: 0.0109, pF: 0.0025, pC: 0.0002 },
  TUR: { pG: 0.6025, pR: 0.2628, pQ: 0.1128, pS: 0.0562, pF: 0.0142, pC: 0.004 },
  URU: { pG: 0.8266, pR: 0.4449, pQ: 0.1528, pS: 0.0758, pF: 0.0318, pC: 0.0123 },
  USA: { pG: 0.768, pR: 0.3701, pQ: 0.1857, pS: 0.1068, pF: 0.0386, pC: 0.0154 },
  UZB: { pG: 0.1862, pR: 0.0316, pQ: 0.0048, pS: 0.0004, pF: 0.0001, pC: 0.0 },
};
