// Auto-generated from M2 batch batch_20260614_230552Z on 2026-06-14T23:05:52Z.
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
  ALG: { pG: 0.4202, pR: 0.0973, pQ: 0.0182, pS: 0.0044, pF: 0.0022, pC: 0.0005 },
  ARG: { pG: 0.9528, pR: 0.6743, pQ: 0.4126, pS: 0.2674, pF: 0.2204, pC: 0.1418 },
  AUS: { pG: 0.5635, pR: 0.2371, pQ: 0.1026, pS: 0.0495, pF: 0.0107, pC: 0.0024 },
  AUT: { pG: 0.5187, pR: 0.1378, pQ: 0.0297, pS: 0.0085, pF: 0.0047, pC: 0.0014 },
  BEL: { pG: 0.9719, pR: 0.5658, pQ: 0.2854, pS: 0.1708, pF: 0.0832, pC: 0.0369 },
  BIH: { pG: 0.2727, pR: 0.1073, pQ: 0.0282, pS: 0.0069, pF: 0.0004, pC: 0.0001 },
  BRA: { pG: 0.9754, pR: 0.7171, pQ: 0.4408, pS: 0.305, pF: 0.1414, pC: 0.0691 },
  CAN: { pG: 0.6812, pR: 0.3417, pQ: 0.1444, pS: 0.0486, pF: 0.0123, pC: 0.0025 },
  CIV: { pG: 0.7681, pR: 0.4726, pQ: 0.1939, pS: 0.0758, pF: 0.0127, pC: 0.0023 },
  COD: { pG: 0.2035, pR: 0.0362, pQ: 0.0064, pS: 0.0008, pF: 0.0003, pC: 0.0 },
  COL: { pG: 0.7477, pR: 0.3267, pQ: 0.1375, pS: 0.0415, pF: 0.0244, pC: 0.0094 },
  CPV: { pG: 0.1352, pR: 0.0605, pQ: 0.0161, pS: 0.0034, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.755, pR: 0.4056, pQ: 0.1717, pS: 0.0551, pF: 0.0343, pC: 0.0159 },
  CUW: { pG: 0.1792, pR: 0.119, pQ: 0.024, pS: 0.0039, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.627, pR: 0.4068, pQ: 0.1578, pS: 0.0532, pF: 0.0075, pC: 0.0012 },
  ECU: { pG: 0.8705, pR: 0.4948, pQ: 0.2218, pS: 0.0887, pF: 0.0219, pC: 0.0063 },
  EGY: { pG: 0.8249, pR: 0.4779, pQ: 0.203, pS: 0.0952, pF: 0.0202, pC: 0.0057 },
  ENG: { pG: 0.9115, pR: 0.634, pQ: 0.4095, pS: 0.195, pF: 0.1477, pC: 0.085 },
  ESP: { pG: 0.9782, pR: 0.7756, pQ: 0.5894, pS: 0.4228, pF: 0.3059, pC: 0.1861 },
  FRA: { pG: 0.9309, pR: 0.7088, pQ: 0.4431, pS: 0.2856, pF: 0.2297, pC: 0.153 },
  GER: { pG: 0.9687, pR: 0.6216, pQ: 0.3821, pS: 0.1754, pF: 0.0899, pC: 0.0352 },
  GHA: { pG: 0.049, pR: 0.0047, pQ: 0.0003, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1333, pR: 0.1056, pQ: 0.0224, pS: 0.0049, pF: 0.0002, pC: 0.0001 },
  IRN: { pG: 0.8918, pR: 0.4622, pQ: 0.2126, pS: 0.1078, pF: 0.0269, pC: 0.0081 },
  IRQ: { pG: 0.1195, pR: 0.0183, pQ: 0.0015, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1083, pR: 0.0101, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7137, pR: 0.4058, pQ: 0.1923, pS: 0.0725, pF: 0.0305, pC: 0.0102 },
  KOR: { pG: 0.8051, pR: 0.5194, pQ: 0.2524, pS: 0.0985, pF: 0.0238, pC: 0.006 },
  KSA: { pG: 0.2177, pR: 0.1006, pQ: 0.0285, pS: 0.0086, pF: 0.0008, pC: 0.0003 },
  MAR: { pG: 0.9715, pR: 0.7117, pQ: 0.4261, pS: 0.2876, pF: 0.1288, pC: 0.0576 },
  MEX: { pG: 0.9183, pR: 0.6536, pQ: 0.4241, pS: 0.2061, pF: 0.0768, pC: 0.0302 },
  NED: { pG: 0.8711, pR: 0.5997, pQ: 0.3826, pS: 0.1814, pF: 0.1039, pC: 0.0463 },
  NOR: { pG: 0.2797, pR: 0.0713, pQ: 0.011, pS: 0.0022, pF: 0.0008, pC: 0.0002 },
  NZL: { pG: 0.1546, pR: 0.1123, pQ: 0.0211, pS: 0.0035, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2845, pR: 0.0859, pQ: 0.0175, pS: 0.0037, pF: 0.002, pC: 0.0003 },
  PAR: { pG: 0.3635, pR: 0.1369, pQ: 0.0531, pS: 0.0213, pF: 0.0034, pC: 0.0005 },
  POR: { pG: 0.8576, pR: 0.4738, pQ: 0.2522, pS: 0.1021, pF: 0.0676, pC: 0.0336 },
  QAT: { pG: 0.4198, pR: 0.1811, pQ: 0.0567, pS: 0.0164, pF: 0.0023, pC: 0.0007 },
  RSA: { pG: 0.4333, pR: 0.2798, pQ: 0.0894, pS: 0.0254, pF: 0.0021, pC: 0.0002 },
  SCO: { pG: 0.6252, pR: 0.4754, pQ: 0.2019, pS: 0.0777, pF: 0.0127, pC: 0.0022 },
  SEN: { pG: 0.6699, pR: 0.2821, pQ: 0.0831, pS: 0.033, pF: 0.0199, pC: 0.0077 },
  SUI: { pG: 0.8426, pR: 0.5103, pQ: 0.3036, pS: 0.1267, pF: 0.0413, pC: 0.0119 },
  SWE: { pG: 0.3408, pR: 0.1584, pQ: 0.0554, pS: 0.0173, pF: 0.0033, pC: 0.0006 },
  TUN: { pG: 0.2879, pR: 0.1281, pQ: 0.0423, pS: 0.0131, pF: 0.002, pC: 0.0003 },
  TUR: { pG: 0.6079, pR: 0.2501, pQ: 0.1115, pS: 0.0522, pF: 0.0143, pC: 0.0033 },
  URU: { pG: 0.8257, pR: 0.4451, pQ: 0.1495, pS: 0.073, pF: 0.0306, pC: 0.0113 },
  USA: { pG: 0.7597, pR: 0.3661, pQ: 0.185, pS: 0.1068, pF: 0.0362, pC: 0.0136 },
  UZB: { pG: 0.1912, pR: 0.0331, pQ: 0.0049, pS: 0.0004, pF: 0.0, pC: 0.0 },
};
