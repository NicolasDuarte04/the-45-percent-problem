// Auto-generated from M2 batch batch_20260614_210752Z on 2026-06-14T21:07:52Z.
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
  ALG: { pG: 0.4303, pR: 0.1034, pQ: 0.0181, pS: 0.0048, pF: 0.0021, pC: 0.0005 },
  ARG: { pG: 0.9516, pR: 0.6783, pQ: 0.4193, pS: 0.2712, pF: 0.219, pC: 0.137 },
  AUS: { pG: 0.5516, pR: 0.2277, pQ: 0.0913, pS: 0.0415, pF: 0.0104, pC: 0.0026 },
  AUT: { pG: 0.5037, pR: 0.1348, pQ: 0.0258, pS: 0.0064, pF: 0.0032, pC: 0.001 },
  BEL: { pG: 0.9733, pR: 0.5703, pQ: 0.2923, pS: 0.1731, pF: 0.0865, pC: 0.0358 },
  BIH: { pG: 0.275, pR: 0.1116, pQ: 0.0293, pS: 0.0079, pF: 0.0011, pC: 0.0003 },
  BRA: { pG: 0.9761, pR: 0.7131, pQ: 0.438, pS: 0.2956, pF: 0.1387, pC: 0.065 },
  CAN: { pG: 0.6833, pR: 0.3442, pQ: 0.1438, pS: 0.0494, pF: 0.0112, pC: 0.0025 },
  CIV: { pG: 0.7761, pR: 0.4739, pQ: 0.1935, pS: 0.0755, pF: 0.0132, pC: 0.003 },
  COD: { pG: 0.2043, pR: 0.0351, pQ: 0.0066, pS: 0.0006, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7455, pR: 0.3313, pQ: 0.1404, pS: 0.042, pF: 0.0252, pC: 0.0096 },
  CPV: { pG: 0.1309, pR: 0.0569, pQ: 0.0125, pS: 0.0032, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7711, pR: 0.4124, pQ: 0.1782, pS: 0.0578, pF: 0.0391, pC: 0.0168 },
  CUW: { pG: 0.1723, pR: 0.1175, pQ: 0.0229, pS: 0.004, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6261, pR: 0.404, pQ: 0.1587, pS: 0.0531, pF: 0.0062, pC: 0.0015 },
  ECU: { pG: 0.8698, pR: 0.5031, pQ: 0.2268, pS: 0.0977, pF: 0.0251, pC: 0.0075 },
  EGY: { pG: 0.8296, pR: 0.4839, pQ: 0.2113, pS: 0.0973, pF: 0.0189, pC: 0.004 },
  ENG: { pG: 0.9074, pR: 0.6127, pQ: 0.3922, pS: 0.1809, pF: 0.137, pC: 0.0776 },
  ESP: { pG: 0.9776, pR: 0.7712, pQ: 0.5845, pS: 0.4249, pF: 0.3144, pC: 0.1912 },
  FRA: { pG: 0.9322, pR: 0.7063, pQ: 0.436, pS: 0.2926, pF: 0.2353, pC: 0.1519 },
  GER: { pG: 0.9723, pR: 0.6275, pQ: 0.3869, pS: 0.1786, pF: 0.0889, pC: 0.0388 },
  GHA: { pG: 0.0509, pR: 0.0057, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1346, pR: 0.1064, pQ: 0.0251, pS: 0.0053, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.896, pR: 0.4778, pQ: 0.2162, pS: 0.111, pF: 0.027, pC: 0.0086 },
  IRQ: { pG: 0.1204, pR: 0.0199, pQ: 0.0021, pS: 0.0008, pF: 0.0001, pC: 0.0001 },
  JOR: { pG: 0.1144, pR: 0.0117, pQ: 0.0011, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7069, pR: 0.3986, pQ: 0.1824, pS: 0.0666, pF: 0.0259, pC: 0.0084 },
  KOR: { pG: 0.8013, pR: 0.5161, pQ: 0.2551, pS: 0.1019, pF: 0.0262, pC: 0.0066 },
  KSA: { pG: 0.2224, pR: 0.0952, pQ: 0.0248, pS: 0.0066, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9715, pR: 0.6994, pQ: 0.4205, pS: 0.2827, pF: 0.1279, pC: 0.0611 },
  MEX: { pG: 0.9205, pR: 0.6526, pQ: 0.4156, pS: 0.2054, pF: 0.0734, pC: 0.0286 },
  NED: { pG: 0.8731, pR: 0.5892, pQ: 0.3805, pS: 0.178, pF: 0.1008, pC: 0.0484 },
  NOR: { pG: 0.2788, pR: 0.0693, pQ: 0.0131, pS: 0.0029, pF: 0.0011, pC: 0.0003 },
  NZL: { pG: 0.1512, pR: 0.1086, pQ: 0.0235, pS: 0.0039, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2706, pR: 0.0844, pQ: 0.0184, pS: 0.0027, pF: 0.0012, pC: 0.0003 },
  PAR: { pG: 0.3664, pR: 0.1432, pQ: 0.0509, pS: 0.0186, pF: 0.0032, pC: 0.0003 },
  POR: { pG: 0.8615, pR: 0.4826, pQ: 0.2572, pS: 0.1026, pF: 0.0703, pC: 0.0353 },
  QAT: { pG: 0.4178, pR: 0.1838, pQ: 0.0605, pS: 0.0154, pF: 0.0018, pC: 0.0002 },
  RSA: { pG: 0.4279, pR: 0.2747, pQ: 0.0849, pS: 0.0215, pF: 0.0018, pC: 0.0007 },
  SCO: { pG: 0.6367, pR: 0.4845, pQ: 0.2181, pS: 0.0819, pF: 0.011, pC: 0.0021 },
  SEN: { pG: 0.6686, pR: 0.2763, pQ: 0.0845, pS: 0.0339, pF: 0.02, pC: 0.0084 },
  SUI: { pG: 0.8481, pR: 0.513, pQ: 0.309, pS: 0.1376, pF: 0.0451, pC: 0.0158 },
  SWE: { pG: 0.3485, pR: 0.1643, pQ: 0.0569, pS: 0.0179, pF: 0.0037, pC: 0.0009 },
  TUN: { pG: 0.281, pR: 0.1259, pQ: 0.0388, pS: 0.0122, pF: 0.0016, pC: 0.0002 },
  TUR: { pG: 0.6, pR: 0.2563, pQ: 0.1107, pS: 0.0548, pF: 0.0139, pC: 0.0035 },
  URU: { pG: 0.819, pR: 0.4361, pQ: 0.1462, pS: 0.0715, pF: 0.0314, pC: 0.0116 },
  USA: { pG: 0.7631, pR: 0.3694, pQ: 0.1885, pS: 0.1054, pF: 0.0351, pC: 0.0118 },
  UZB: { pG: 0.1887, pR: 0.0358, pQ: 0.0066, pS: 0.0007, pF: 0.0002, pC: 0.0001 },
};
