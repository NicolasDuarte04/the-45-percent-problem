// Auto-generated from M2 batch batch_20260616_232200Z on 2026-06-16T23:22:00Z.
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
  ALG: { pG: 0.4299, pR: 0.1002, pQ: 0.019, pS: 0.0038, pF: 0.0015, pC: 0.0002 },
  ARG: { pG: 0.9559, pR: 0.689, pQ: 0.4252, pS: 0.2758, pF: 0.2231, pC: 0.1447 },
  AUS: { pG: 0.557, pR: 0.2305, pQ: 0.0951, pS: 0.0411, pF: 0.0103, pC: 0.0022 },
  AUT: { pG: 0.5067, pR: 0.1443, pQ: 0.0279, pS: 0.0079, pF: 0.0036, pC: 0.0013 },
  BEL: { pG: 0.9738, pR: 0.5725, pQ: 0.2883, pS: 0.1701, pF: 0.0832, pC: 0.0391 },
  BIH: { pG: 0.2775, pR: 0.1074, pQ: 0.027, pS: 0.005, pF: 0.0006, pC: 0.0002 },
  BRA: { pG: 0.9737, pR: 0.7156, pQ: 0.4436, pS: 0.3031, pF: 0.1404, pC: 0.0622 },
  CAN: { pG: 0.6669, pR: 0.3336, pQ: 0.144, pS: 0.0474, pF: 0.0115, pC: 0.003 },
  CIV: { pG: 0.7624, pR: 0.4621, pQ: 0.1967, pS: 0.0772, pF: 0.0164, pC: 0.0038 },
  COD: { pG: 0.2117, pR: 0.0379, pQ: 0.0068, pS: 0.0008, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.741, pR: 0.3322, pQ: 0.1418, pS: 0.0411, pF: 0.0237, pC: 0.0097 },
  CPV: { pG: 0.1351, pR: 0.0552, pQ: 0.0119, pS: 0.0028, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7621, pR: 0.4034, pQ: 0.1684, pS: 0.0542, pF: 0.034, pC: 0.0147 },
  CUW: { pG: 0.1776, pR: 0.1161, pQ: 0.0238, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6232, pR: 0.4007, pQ: 0.1618, pS: 0.0561, pF: 0.0078, pC: 0.0015 },
  ECU: { pG: 0.8686, pR: 0.5008, pQ: 0.2303, pS: 0.1007, pF: 0.0252, pC: 0.007 },
  EGY: { pG: 0.8318, pR: 0.474, pQ: 0.2113, pS: 0.0991, pF: 0.0218, pC: 0.0059 },
  ENG: { pG: 0.9135, pR: 0.634, pQ: 0.4097, pS: 0.1995, pF: 0.1511, pC: 0.0877 },
  ESP: { pG: 0.9773, pR: 0.7763, pQ: 0.586, pS: 0.4213, pF: 0.3125, pC: 0.1876 },
  FRA: { pG: 0.9327, pR: 0.6977, pQ: 0.4349, pS: 0.281, pF: 0.2253, pC: 0.1466 },
  GER: { pG: 0.9725, pR: 0.6238, pQ: 0.381, pS: 0.1755, pF: 0.0913, pC: 0.0403 },
  GHA: { pG: 0.0466, pR: 0.0056, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1298, pR: 0.1027, pQ: 0.0197, pS: 0.0035, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8889, pR: 0.4702, pQ: 0.2172, pS: 0.11, pF: 0.0284, pC: 0.0082 },
  IRQ: { pG: 0.1148, pR: 0.0166, pQ: 0.0011, pS: 0.0, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1075, pR: 0.0099, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7129, pR: 0.4067, pQ: 0.1881, pS: 0.0729, pF: 0.0297, pC: 0.011 },
  KOR: { pG: 0.8071, pR: 0.5236, pQ: 0.256, pS: 0.102, pF: 0.0251, pC: 0.0068 },
  KSA: { pG: 0.2125, pR: 0.0956, pQ: 0.0236, pS: 0.0071, pF: 0.0004, pC: 0.0 },
  MAR: { pG: 0.9733, pR: 0.7031, pQ: 0.4259, pS: 0.2883, pF: 0.132, pC: 0.0617 },
  MEX: { pG: 0.9199, pR: 0.6605, pQ: 0.4227, pS: 0.2099, pF: 0.0715, pC: 0.0256 },
  NED: { pG: 0.8723, pR: 0.5951, pQ: 0.3748, pS: 0.1677, pF: 0.0957, pC: 0.0449 },
  NOR: { pG: 0.2781, pR: 0.0691, pQ: 0.0118, pS: 0.0034, pF: 0.0013, pC: 0.0006 },
  NZL: { pG: 0.1521, pR: 0.1104, pQ: 0.0194, pS: 0.0028, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2778, pR: 0.0858, pQ: 0.0208, pS: 0.0036, pF: 0.0015, pC: 0.0004 },
  PAR: { pG: 0.3717, pR: 0.1441, pQ: 0.0512, pS: 0.0196, pF: 0.0023, pC: 0.0003 },
  POR: { pG: 0.8583, pR: 0.47, pQ: 0.2467, pS: 0.0971, pF: 0.0685, pC: 0.0351 },
  QAT: { pG: 0.4267, pR: 0.1813, pQ: 0.0595, pS: 0.0152, pF: 0.0016, pC: 0.0004 },
  RSA: { pG: 0.4362, pR: 0.2856, pQ: 0.0925, pS: 0.0267, pF: 0.0032, pC: 0.0003 },
  SCO: { pG: 0.6344, pR: 0.4845, pQ: 0.2106, pS: 0.0815, pF: 0.011, pC: 0.0024 },
  SEN: { pG: 0.6744, pR: 0.2732, pQ: 0.0794, pS: 0.0317, pF: 0.018, pC: 0.0072 },
  SUI: { pG: 0.8425, pR: 0.5073, pQ: 0.2972, pS: 0.1267, pF: 0.0388, pC: 0.0111 },
  SWE: { pG: 0.3476, pR: 0.164, pQ: 0.0563, pS: 0.0182, pF: 0.0041, pC: 0.0006 },
  TUN: { pG: 0.2861, pR: 0.1314, pQ: 0.0436, pS: 0.0125, pF: 0.0013, pC: 0.0001 },
  TUR: { pG: 0.5966, pR: 0.2529, pQ: 0.1071, pS: 0.0539, pF: 0.0142, pC: 0.0031 },
  URU: { pG: 0.8285, pR: 0.4458, pQ: 0.1477, pS: 0.0714, pF: 0.0307, pC: 0.0101 },
  USA: { pG: 0.7635, pR: 0.3666, pQ: 0.1861, pS: 0.1064, pF: 0.0365, pC: 0.0124 },
  UZB: { pG: 0.189, pR: 0.0311, pQ: 0.0054, pS: 0.0001, pF: 0.0, pC: 0.0 },
};
