// Auto-generated from M2 batch batch_20260620_135309Z on 2026-06-20T13:53:09Z.
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
  ALG: { pG: 0.4298, pR: 0.1037, pQ: 0.0192, pS: 0.0043, pF: 0.0022, pC: 0.0005 },
  ARG: { pG: 0.9548, pR: 0.6843, pQ: 0.4273, pS: 0.2757, pF: 0.2186, pC: 0.1425 },
  AUS: { pG: 0.5587, pR: 0.2342, pQ: 0.0958, pS: 0.0451, pF: 0.0108, pC: 0.0021 },
  AUT: { pG: 0.5089, pR: 0.1366, pQ: 0.0256, pS: 0.0082, pF: 0.0037, pC: 0.0013 },
  BEL: { pG: 0.973, pR: 0.5627, pQ: 0.2776, pS: 0.1631, pF: 0.0786, pC: 0.0339 },
  BIH: { pG: 0.2703, pR: 0.111, pQ: 0.028, pS: 0.0052, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.9725, pR: 0.7125, pQ: 0.4399, pS: 0.3006, pF: 0.1414, pC: 0.0672 },
  CAN: { pG: 0.6785, pR: 0.3351, pQ: 0.148, pS: 0.0506, pF: 0.0104, pC: 0.0027 },
  CIV: { pG: 0.7731, pR: 0.4737, pQ: 0.1996, pS: 0.0805, pF: 0.0158, pC: 0.003 },
  COD: { pG: 0.2107, pR: 0.0418, pQ: 0.0066, pS: 0.0005, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7494, pR: 0.3323, pQ: 0.1385, pS: 0.0409, pF: 0.0253, pC: 0.0098 },
  CPV: { pG: 0.1329, pR: 0.0567, pQ: 0.0126, pS: 0.0034, pF: 0.0004, pC: 0.0 },
  CRO: { pG: 0.754, pR: 0.4009, pQ: 0.1661, pS: 0.0574, pF: 0.0363, pC: 0.0159 },
  CUW: { pG: 0.1799, pR: 0.1209, pQ: 0.0269, pS: 0.0053, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.618, pR: 0.3968, pQ: 0.158, pS: 0.0537, pF: 0.0075, pC: 0.0013 },
  ECU: { pG: 0.8711, pR: 0.499, pQ: 0.2228, pS: 0.0927, pF: 0.0253, pC: 0.0068 },
  EGY: { pG: 0.8281, pR: 0.4732, pQ: 0.2114, pS: 0.1004, pF: 0.0196, pC: 0.0056 },
  ENG: { pG: 0.9087, pR: 0.629, pQ: 0.42, pS: 0.193, pF: 0.1453, pC: 0.0829 },
  ESP: { pG: 0.9797, pR: 0.7795, pQ: 0.5936, pS: 0.4238, pF: 0.307, pC: 0.1872 },
  FRA: { pG: 0.9323, pR: 0.6987, pQ: 0.4291, pS: 0.2843, pF: 0.2294, pC: 0.1455 },
  GER: { pG: 0.9701, pR: 0.6292, pQ: 0.3845, pS: 0.1825, pF: 0.0893, pC: 0.039 },
  GHA: { pG: 0.0511, pR: 0.0068, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.136, pR: 0.1059, pQ: 0.0234, pS: 0.0044, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8949, pR: 0.474, pQ: 0.2104, pS: 0.1062, pF: 0.0283, pC: 0.0084 },
  IRQ: { pG: 0.1151, pR: 0.0172, pQ: 0.0023, pS: 0.0004, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1065, pR: 0.0103, pQ: 0.0004, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7131, pR: 0.4015, pQ: 0.1888, pS: 0.0693, pF: 0.0284, pC: 0.0099 },
  KOR: { pG: 0.8083, pR: 0.5166, pQ: 0.253, pS: 0.1, pF: 0.0236, pC: 0.0067 },
  KSA: { pG: 0.2109, pR: 0.0968, pQ: 0.0255, pS: 0.0081, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9703, pR: 0.7113, pQ: 0.4361, pS: 0.2935, pF: 0.1408, pC: 0.0639 },
  MEX: { pG: 0.9186, pR: 0.6508, pQ: 0.4149, pS: 0.2056, pF: 0.0771, pC: 0.0298 },
  NED: { pG: 0.871, pR: 0.5953, pQ: 0.377, pS: 0.1781, pF: 0.1023, pC: 0.0456 },
  NOR: { pG: 0.2764, pR: 0.0721, pQ: 0.0141, pS: 0.0025, pF: 0.0009, pC: 0.0002 },
  NZL: { pG: 0.1512, pR: 0.1076, pQ: 0.0176, pS: 0.0031, pF: 0.0003, pC: 0.0 },
  PAN: { pG: 0.2862, pR: 0.0896, pQ: 0.02, pS: 0.0025, pF: 0.0008, pC: 0.0005 },
  PAR: { pG: 0.3762, pR: 0.1394, pQ: 0.0496, pS: 0.0172, pF: 0.0024, pC: 0.0004 },
  POR: { pG: 0.8549, pR: 0.4655, pQ: 0.2434, pS: 0.0981, pF: 0.0658, pC: 0.0326 },
  QAT: { pG: 0.4234, pR: 0.1856, pQ: 0.0626, pS: 0.0152, pF: 0.0025, pC: 0.0002 },
  RSA: { pG: 0.4332, pR: 0.2868, pQ: 0.0933, pS: 0.0251, pF: 0.0024, pC: 0.0004 },
  SCO: { pG: 0.6194, pR: 0.4678, pQ: 0.2, pS: 0.0761, pF: 0.0106, pC: 0.0019 },
  SEN: { pG: 0.6762, pR: 0.2771, pQ: 0.082, pS: 0.0317, pF: 0.0197, pC: 0.0081 },
  SUI: { pG: 0.8497, pR: 0.5173, pQ: 0.3018, pS: 0.1256, pF: 0.0401, pC: 0.0146 },
  SWE: { pG: 0.3408, pR: 0.1562, pQ: 0.0553, pS: 0.0173, pF: 0.0033, pC: 0.0007 },
  TUN: { pG: 0.2809, pR: 0.1242, pQ: 0.044, pS: 0.0119, pF: 0.0022, pC: 0.0003 },
  TUR: { pG: 0.6062, pR: 0.259, pQ: 0.1132, pS: 0.0556, pF: 0.0128, pC: 0.003 },
  URU: { pG: 0.8293, pR: 0.4495, pQ: 0.1524, pS: 0.0773, pF: 0.0317, pC: 0.011 },
  USA: { pG: 0.7607, pR: 0.3699, pQ: 0.1824, pS: 0.1035, pF: 0.0356, pC: 0.0145 },
  UZB: { pG: 0.185, pR: 0.0341, pQ: 0.0049, pS: 0.0004, pF: 0.0001, pC: 0.0 },
};
