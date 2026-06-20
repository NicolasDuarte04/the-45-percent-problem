// Auto-generated from M2 batch batch_20260512_013228Z on 2026-05-12T01:32:28Z.
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
  ALG: { pG: 0.4307, pR: 0.101, pQ: 0.0175, pS: 0.0042, pF: 0.0013, pC: 0.0003 },
  ARG: { pG: 0.9531, pR: 0.6775, pQ: 0.4179, pS: 0.2701, pF: 0.2164, pC: 0.1374 },
  AUS: { pG: 0.5536, pR: 0.2292, pQ: 0.0949, pS: 0.0437, pF: 0.0102, pC: 0.0034 },
  AUT: { pG: 0.5054, pR: 0.1378, pQ: 0.0275, pS: 0.0079, pF: 0.0035, pC: 0.0011 },
  BEL: { pG: 0.9709, pR: 0.5663, pQ: 0.2812, pS: 0.1659, pF: 0.0782, pC: 0.0341 },
  BIH: { pG: 0.2744, pR: 0.1086, pQ: 0.0268, pS: 0.0061, pF: 0.0006, pC: 0.0002 },
  BRA: { pG: 0.9726, pR: 0.7137, pQ: 0.4393, pS: 0.3045, pF: 0.142, pC: 0.0635 },
  CAN: { pG: 0.675, pR: 0.3421, pQ: 0.1521, pS: 0.0479, pF: 0.0116, pC: 0.0031 },
  CIV: { pG: 0.7791, pR: 0.4771, pQ: 0.1948, pS: 0.0768, pF: 0.0108, pC: 0.0027 },
  COD: { pG: 0.2085, pR: 0.0378, pQ: 0.0071, pS: 0.001, pF: 0.0001, pC: 0.0001 },
  COL: { pG: 0.7435, pR: 0.3314, pQ: 0.1372, pS: 0.0412, pF: 0.0285, pC: 0.0105 },
  CPV: { pG: 0.1343, pR: 0.0551, pQ: 0.0129, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7613, pR: 0.4045, pQ: 0.1709, pS: 0.0601, pF: 0.0392, pC: 0.0193 },
  CUW: { pG: 0.171, pR: 0.1167, pQ: 0.023, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6166, pR: 0.4018, pQ: 0.1608, pS: 0.053, pF: 0.0083, pC: 0.0013 },
  ECU: { pG: 0.8677, pR: 0.5009, pQ: 0.2379, pS: 0.1001, pF: 0.0259, pC: 0.0074 },
  EGY: { pG: 0.8274, pR: 0.4797, pQ: 0.2067, pS: 0.0933, pF: 0.0185, pC: 0.0042 },
  ENG: { pG: 0.9135, pR: 0.6299, pQ: 0.4017, pS: 0.189, pF: 0.1457, pC: 0.083 },
  ESP: { pG: 0.9791, pR: 0.781, pQ: 0.5878, pS: 0.4238, pF: 0.3014, pC: 0.1824 },
  FRA: { pG: 0.9309, pR: 0.7019, pQ: 0.436, pS: 0.2848, pF: 0.2292, pC: 0.1488 },
  GER: { pG: 0.9711, pR: 0.6248, pQ: 0.382, pS: 0.1768, pF: 0.0859, pC: 0.038 },
  GHA: { pG: 0.0486, pR: 0.0058, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1319, pR: 0.1029, pQ: 0.0198, pS: 0.0034, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8942, pR: 0.4701, pQ: 0.215, pS: 0.109, pF: 0.028, pC: 0.0087 },
  IRQ: { pG: 0.1242, pR: 0.0188, pQ: 0.002, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1108, pR: 0.0102, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.714, pR: 0.4051, pQ: 0.1832, pS: 0.0686, pF: 0.0309, pC: 0.0102 },
  KOR: { pG: 0.8102, pR: 0.5236, pQ: 0.2601, pS: 0.1037, pF: 0.024, pC: 0.0079 },
  KSA: { pG: 0.2089, pR: 0.0951, pQ: 0.027, pS: 0.008, pF: 0.0006, pC: 0.0001 },
  MAR: { pG: 0.9736, pR: 0.7033, pQ: 0.4246, pS: 0.2939, pF: 0.1423, pC: 0.0642 },
  MEX: { pG: 0.9228, pR: 0.6537, pQ: 0.4155, pS: 0.2023, pF: 0.0749, pC: 0.0282 },
  NED: { pG: 0.8691, pR: 0.5951, pQ: 0.3859, pS: 0.1779, pF: 0.103, pC: 0.0482 },
  NOR: { pG: 0.2747, pR: 0.0675, pQ: 0.0129, pS: 0.0032, pF: 0.0011, pC: 0.0002 },
  NZL: { pG: 0.1588, pR: 0.1128, pQ: 0.022, pS: 0.0045, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2766, pR: 0.0779, pQ: 0.0184, pS: 0.0031, pF: 0.0013, pC: 0.0004 },
  PAR: { pG: 0.3733, pR: 0.1428, pQ: 0.0527, pS: 0.0197, pF: 0.0031, pC: 0.0005 },
  POR: { pG: 0.8558, pR: 0.4777, pQ: 0.258, pS: 0.0988, pF: 0.0682, pC: 0.0333 },
  QAT: { pG: 0.431, pR: 0.1813, pQ: 0.0574, pS: 0.015, pF: 0.002, pC: 0.0003 },
  RSA: { pG: 0.4276, pR: 0.2729, pQ: 0.0866, pS: 0.0231, pF: 0.0012, pC: 0.0 },
  SCO: { pG: 0.6328, pR: 0.4881, pQ: 0.2088, pS: 0.0791, pF: 0.0107, pC: 0.002 },
  SEN: { pG: 0.6702, pR: 0.2853, pQ: 0.0859, pS: 0.0359, pF: 0.0217, pC: 0.0091 },
  SUI: { pG: 0.8424, pR: 0.516, pQ: 0.3058, pS: 0.1323, pF: 0.0439, pC: 0.0151 },
  SWE: { pG: 0.3437, pR: 0.1588, pQ: 0.0533, pS: 0.0181, pF: 0.0031, pC: 0.0008 },
  TUN: { pG: 0.2843, pR: 0.1215, pQ: 0.0393, pS: 0.0125, pF: 0.0017, pC: 0.0001 },
  TUR: { pG: 0.6046, pR: 0.2582, pQ: 0.1103, pS: 0.0556, pF: 0.0132, pC: 0.0043 },
  URU: { pG: 0.8264, pR: 0.4399, pQ: 0.148, pS: 0.0707, pF: 0.0312, pC: 0.013 },
  USA: { pG: 0.7576, pR: 0.3618, pQ: 0.1845, pS: 0.1034, pF: 0.0357, pC: 0.0126 },
  UZB: { pG: 0.1922, pR: 0.035, pQ: 0.0064, pS: 0.0005, pF: 0.0002, pC: 0.0 },
};
