// Auto-generated from M2 batch batch_20260613_020713Z on 2026-06-13T02:07:13Z.
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
  ALG: { pG: 0.4221, pR: 0.1036, pQ: 0.0208, pS: 0.0058, pF: 0.0024, pC: 0.0007 },
  ARG: { pG: 0.9534, pR: 0.6768, pQ: 0.4188, pS: 0.2732, pF: 0.2213, pC: 0.1429 },
  AUS: { pG: 0.561, pR: 0.2338, pQ: 0.0974, pS: 0.0461, pF: 0.011, pC: 0.0027 },
  AUT: { pG: 0.5134, pR: 0.142, pQ: 0.0264, pS: 0.0077, pF: 0.0039, pC: 0.0013 },
  BEL: { pG: 0.9722, pR: 0.5704, pQ: 0.2896, pS: 0.1739, pF: 0.0835, pC: 0.036 },
  BIH: { pG: 0.2656, pR: 0.1074, pQ: 0.0298, pS: 0.005, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9743, pR: 0.722, pQ: 0.4403, pS: 0.3013, pF: 0.1387, pC: 0.0658 },
  CAN: { pG: 0.6794, pR: 0.3328, pQ: 0.1395, pS: 0.0455, pF: 0.0085, pC: 0.0012 },
  CIV: { pG: 0.7655, pR: 0.4637, pQ: 0.1959, pS: 0.0802, pF: 0.0136, pC: 0.0032 },
  COD: { pG: 0.2128, pR: 0.0384, pQ: 0.0061, pS: 0.0009, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7461, pR: 0.3338, pQ: 0.1342, pS: 0.0399, pF: 0.0244, pC: 0.0095 },
  CPV: { pG: 0.1343, pR: 0.0571, pQ: 0.0133, pS: 0.0037, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.764, pR: 0.4145, pQ: 0.1741, pS: 0.0579, pF: 0.0363, pC: 0.0154 },
  CUW: { pG: 0.1774, pR: 0.121, pQ: 0.0233, pS: 0.0043, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6266, pR: 0.3995, pQ: 0.1604, pS: 0.053, pF: 0.008, pC: 0.0021 },
  ECU: { pG: 0.8685, pR: 0.493, pQ: 0.2239, pS: 0.0924, pF: 0.0245, pC: 0.0071 },
  EGY: { pG: 0.8338, pR: 0.4809, pQ: 0.2113, pS: 0.0976, pF: 0.0184, pC: 0.0043 },
  ENG: { pG: 0.9065, pR: 0.6236, pQ: 0.4062, pS: 0.1893, pF: 0.1448, pC: 0.0859 },
  ESP: { pG: 0.9784, pR: 0.7739, pQ: 0.5842, pS: 0.4226, pF: 0.3108, pC: 0.1945 },
  FRA: { pG: 0.9314, pR: 0.7001, pQ: 0.4359, pS: 0.2854, pF: 0.226, pC: 0.1418 },
  GER: { pG: 0.9714, pR: 0.6208, pQ: 0.3777, pS: 0.1785, pF: 0.0883, pC: 0.0375 },
  GHA: { pG: 0.0503, pR: 0.0053, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1359, pR: 0.109, pQ: 0.0255, pS: 0.0046, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8949, pR: 0.4765, pQ: 0.2199, pS: 0.1128, pF: 0.0305, pC: 0.0087 },
  IRQ: { pG: 0.1211, pR: 0.0168, pQ: 0.0016, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1111, pR: 0.0126, pQ: 0.001, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7085, pR: 0.3979, pQ: 0.1846, pS: 0.0698, pF: 0.0294, pC: 0.0114 },
  KOR: { pG: 0.8088, pR: 0.527, pQ: 0.2608, pS: 0.1076, pF: 0.0252, pC: 0.0052 },
  KSA: { pG: 0.2134, pR: 0.092, pQ: 0.0228, pS: 0.0058, pF: 0.0004, pC: 0.0 },
  MAR: { pG: 0.9731, pR: 0.709, pQ: 0.4234, pS: 0.2891, pF: 0.1328, pC: 0.0601 },
  MEX: { pG: 0.9202, pR: 0.6556, pQ: 0.4175, pS: 0.196, pF: 0.0734, pC: 0.0265 },
  NED: { pG: 0.8739, pR: 0.6059, pQ: 0.3864, pS: 0.1776, pF: 0.1003, pC: 0.0448 },
  NOR: { pG: 0.2816, pR: 0.0717, pQ: 0.0127, pS: 0.0026, pF: 0.0009, pC: 0.0001 },
  NZL: { pG: 0.1528, pR: 0.1091, pQ: 0.0223, pS: 0.0035, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2792, pR: 0.0848, pQ: 0.0196, pS: 0.0028, pF: 0.0012, pC: 0.0003 },
  PAR: { pG: 0.3683, pR: 0.1396, pQ: 0.0515, pS: 0.0211, pF: 0.0032, pC: 0.0004 },
  POR: { pG: 0.8535, pR: 0.467, pQ: 0.254, pS: 0.0982, pF: 0.0684, pC: 0.0339 },
  QAT: { pG: 0.431, pR: 0.1824, pQ: 0.0607, pS: 0.015, pF: 0.0015, pC: 0.0001 },
  RSA: { pG: 0.4295, pR: 0.2767, pQ: 0.0902, pS: 0.0233, pF: 0.0033, pC: 0.0006 },
  SCO: { pG: 0.6295, pR: 0.4821, pQ: 0.2068, pS: 0.0783, pF: 0.0106, pC: 0.002 },
  SEN: { pG: 0.6659, pR: 0.2764, pQ: 0.0828, pS: 0.0351, pF: 0.0214, pC: 0.0079 },
  SUI: { pG: 0.8389, pR: 0.5186, pQ: 0.3077, pS: 0.1287, pF: 0.0431, pC: 0.0144 },
  SWE: { pG: 0.3463, pR: 0.1669, pQ: 0.0559, pS: 0.0169, pF: 0.0023, pC: 0.0005 },
  TUN: { pG: 0.2885, pR: 0.1308, pQ: 0.0406, pS: 0.0132, pF: 0.0017, pC: 0.0005 },
  TUR: { pG: 0.5967, pR: 0.2461, pQ: 0.1051, pS: 0.053, pF: 0.0117, pC: 0.0032 },
  URU: { pG: 0.8202, pR: 0.4401, pQ: 0.1483, pS: 0.0719, pF: 0.033, pC: 0.0131 },
  USA: { pG: 0.7612, pR: 0.3584, pQ: 0.1834, pS: 0.1077, pF: 0.0399, pC: 0.0144 },
  UZB: { pG: 0.1876, pR: 0.0326, pQ: 0.0053, pS: 0.0007, pF: 0.0001, pC: 0.0 },
};
