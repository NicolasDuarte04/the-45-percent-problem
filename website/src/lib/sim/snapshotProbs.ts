// Auto-generated from M2 batch batch_20260619_061437Z on 2026-06-19T06:14:37Z.
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
  ALG: { pG: 0.4165, pR: 0.0998, pQ: 0.0179, pS: 0.0041, pF: 0.0022, pC: 0.0004 },
  ARG: { pG: 0.955, pR: 0.6743, pQ: 0.4186, pS: 0.2694, pF: 0.2167, pC: 0.1394 },
  AUS: { pG: 0.5603, pR: 0.2295, pQ: 0.092, pS: 0.0423, pF: 0.0108, pC: 0.0033 },
  AUT: { pG: 0.5172, pR: 0.1459, pQ: 0.0284, pS: 0.0081, pF: 0.0032, pC: 0.0011 },
  BEL: { pG: 0.9737, pR: 0.5703, pQ: 0.2827, pS: 0.1712, pF: 0.0857, pC: 0.0381 },
  BIH: { pG: 0.266, pR: 0.1031, pQ: 0.0275, pS: 0.0058, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.9735, pR: 0.713, pQ: 0.4455, pS: 0.3081, pF: 0.1456, pC: 0.0701 },
  CAN: { pG: 0.6845, pR: 0.3396, pQ: 0.1493, pS: 0.0452, pF: 0.0089, pC: 0.0015 },
  CIV: { pG: 0.7725, pR: 0.4687, pQ: 0.1923, pS: 0.0759, pF: 0.0128, pC: 0.0029 },
  COD: { pG: 0.2077, pR: 0.0397, pQ: 0.0066, pS: 0.0008, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7435, pR: 0.3247, pQ: 0.1312, pS: 0.041, pF: 0.0246, pC: 0.0104 },
  CPV: { pG: 0.1342, pR: 0.0612, pQ: 0.013, pS: 0.0026, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7662, pR: 0.4119, pQ: 0.1757, pS: 0.0575, pF: 0.0348, pC: 0.0146 },
  CUW: { pG: 0.1742, pR: 0.1175, pQ: 0.0254, pS: 0.0048, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.627, pR: 0.4038, pQ: 0.1617, pS: 0.0555, pF: 0.0072, pC: 0.0008 },
  ECU: { pG: 0.8705, pR: 0.4834, pQ: 0.219, pS: 0.0898, pF: 0.0205, pC: 0.006 },
  EGY: { pG: 0.8274, pR: 0.4697, pQ: 0.2058, pS: 0.0947, pF: 0.0166, pC: 0.004 },
  ENG: { pG: 0.9078, pR: 0.6349, pQ: 0.419, pS: 0.2005, pF: 0.1537, pC: 0.0936 },
  ESP: { pG: 0.9783, pR: 0.7787, pQ: 0.5982, pS: 0.4385, pF: 0.3179, pC: 0.1893 },
  FRA: { pG: 0.9322, pR: 0.7013, pQ: 0.4358, pS: 0.2803, pF: 0.226, pC: 0.1468 },
  GER: { pG: 0.9694, pR: 0.6247, pQ: 0.3794, pS: 0.1761, pF: 0.0891, pC: 0.0357 },
  GHA: { pG: 0.0464, pR: 0.0054, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1319, pR: 0.1056, pQ: 0.0223, pS: 0.0035, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8909, pR: 0.4736, pQ: 0.215, pS: 0.109, pF: 0.0292, pC: 0.0089 },
  IRQ: { pG: 0.1198, pR: 0.0166, pQ: 0.0016, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1113, pR: 0.0112, pQ: 0.0007, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7112, pR: 0.4097, pQ: 0.195, pS: 0.0677, pF: 0.0281, pC: 0.0083 },
  KOR: { pG: 0.8091, pR: 0.5311, pQ: 0.264, pS: 0.1053, pF: 0.0235, pC: 0.0059 },
  KSA: { pG: 0.2125, pR: 0.0973, pQ: 0.0261, pS: 0.0081, pF: 0.0009, pC: 0.0001 },
  MAR: { pG: 0.9677, pR: 0.6964, pQ: 0.4133, pS: 0.2839, pF: 0.1323, pC: 0.0602 },
  MEX: { pG: 0.9216, pR: 0.6548, pQ: 0.4222, pS: 0.2017, pF: 0.0714, pC: 0.0257 },
  NED: { pG: 0.8737, pR: 0.6075, pQ: 0.3871, pS: 0.1756, pF: 0.0984, pC: 0.0469 },
  NOR: { pG: 0.2857, pR: 0.0701, pQ: 0.0117, pS: 0.0024, pF: 0.0016, pC: 0.0001 },
  NZL: { pG: 0.1549, pR: 0.1104, pQ: 0.0209, pS: 0.0035, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2796, pR: 0.0827, pQ: 0.0181, pS: 0.0031, pF: 0.001, pC: 0.0003 },
  PAR: { pG: 0.3703, pR: 0.1436, pQ: 0.0495, pS: 0.0185, pF: 0.0022, pC: 0.0005 },
  POR: { pG: 0.8537, pR: 0.4681, pQ: 0.2438, pS: 0.0967, pF: 0.069, pC: 0.0325 },
  QAT: { pG: 0.4251, pR: 0.1825, pQ: 0.0615, pS: 0.0153, pF: 0.0015, pC: 0.0002 },
  RSA: { pG: 0.4278, pR: 0.2774, pQ: 0.089, pS: 0.0243, pF: 0.0026, pC: 0.0002 },
  SCO: { pG: 0.6304, pR: 0.4838, pQ: 0.2014, pS: 0.0805, pF: 0.0105, pC: 0.0018 },
  SEN: { pG: 0.6623, pR: 0.2808, pQ: 0.0853, pS: 0.0355, pF: 0.0207, pC: 0.0085 },
  SUI: { pG: 0.8389, pR: 0.5077, pQ: 0.3004, pS: 0.1279, pF: 0.0416, pC: 0.0129 },
  SWE: { pG: 0.3442, pR: 0.1614, pQ: 0.0563, pS: 0.0183, pF: 0.003, pC: 0.0006 },
  TUN: { pG: 0.2843, pR: 0.1271, pQ: 0.0389, pS: 0.0122, pF: 0.0014, pC: 0.0003 },
  TUR: { pG: 0.6013, pR: 0.2583, pQ: 0.1132, pS: 0.0574, pF: 0.0155, pC: 0.0046 },
  URU: { pG: 0.8281, pR: 0.4388, pQ: 0.1449, pS: 0.0701, pF: 0.0285, pC: 0.0106 },
  USA: { pG: 0.7646, pR: 0.3698, pQ: 0.1872, pS: 0.1067, pF: 0.0397, pC: 0.0127 },
  UZB: { pG: 0.1951, pR: 0.0326, pQ: 0.0051, pS: 0.0003, pF: 0.0002, pC: 0.0001 },
};
