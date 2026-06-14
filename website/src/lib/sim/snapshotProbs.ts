// Auto-generated from M2 batch batch_20260614_112833Z on 2026-06-14T11:28:33Z.
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
  ALG: { pG: 0.4311, pR: 0.1012, pQ: 0.0181, pS: 0.0048, pF: 0.0011, pC: 0.0004 },
  ARG: { pG: 0.9572, pR: 0.6859, pQ: 0.4208, pS: 0.2668, pF: 0.2116, pC: 0.1401 },
  AUS: { pG: 0.5567, pR: 0.2282, pQ: 0.0953, pS: 0.0452, pF: 0.0106, pC: 0.0024 },
  AUT: { pG: 0.51, pR: 0.1414, pQ: 0.0269, pS: 0.0077, pF: 0.0037, pC: 0.0008 },
  BEL: { pG: 0.9734, pR: 0.561, pQ: 0.2811, pS: 0.1647, pF: 0.0809, pC: 0.0352 },
  BIH: { pG: 0.2754, pR: 0.1091, pQ: 0.0292, pS: 0.0063, pF: 0.0003, pC: 0.0001 },
  BRA: { pG: 0.9744, pR: 0.7158, pQ: 0.4403, pS: 0.3036, pF: 0.1398, pC: 0.0661 },
  CAN: { pG: 0.6812, pR: 0.336, pQ: 0.1431, pS: 0.0444, pF: 0.01, pC: 0.0024 },
  CIV: { pG: 0.7631, pR: 0.4645, pQ: 0.1889, pS: 0.0792, pF: 0.0126, pC: 0.0022 },
  COD: { pG: 0.2058, pR: 0.0418, pQ: 0.0076, pS: 0.0008, pF: 0.0005, pC: 0.0 },
  COL: { pG: 0.7481, pR: 0.3248, pQ: 0.1364, pS: 0.0431, pF: 0.0253, pC: 0.011 },
  CPV: { pG: 0.1358, pR: 0.0561, pQ: 0.0106, pS: 0.0028, pF: 0.0002, pC: 0.0001 },
  CRO: { pG: 0.7652, pR: 0.4138, pQ: 0.169, pS: 0.0596, pF: 0.0383, pC: 0.0172 },
  CUW: { pG: 0.1847, pR: 0.126, pQ: 0.0247, pS: 0.0037, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6188, pR: 0.4026, pQ: 0.1616, pS: 0.0539, pF: 0.0082, pC: 0.0013 },
  ECU: { pG: 0.8688, pR: 0.499, pQ: 0.2259, pS: 0.0937, pF: 0.0246, pC: 0.0067 },
  EGY: { pG: 0.8341, pR: 0.4908, pQ: 0.2177, pS: 0.1041, pF: 0.0247, pC: 0.0063 },
  ENG: { pG: 0.9052, pR: 0.6338, pQ: 0.4196, pS: 0.2046, pF: 0.1575, pC: 0.0911 },
  ESP: { pG: 0.9772, pR: 0.7734, pQ: 0.5922, pS: 0.4243, pF: 0.3016, pC: 0.1915 },
  FRA: { pG: 0.9297, pR: 0.7022, pQ: 0.4353, pS: 0.2786, pF: 0.2242, pC: 0.1452 },
  GER: { pG: 0.9715, pR: 0.6229, pQ: 0.383, pS: 0.1841, pF: 0.091, pC: 0.0376 },
  GHA: { pG: 0.0548, pR: 0.0064, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.13, pR: 0.1025, pQ: 0.0241, pS: 0.0049, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8947, pR: 0.4701, pQ: 0.2157, pS: 0.1065, pF: 0.0284, pC: 0.0097 },
  IRQ: { pG: 0.1196, pR: 0.0176, pQ: 0.0022, pS: 0.0003, pF: 0.0002, pC: 0.0 },
  JOR: { pG: 0.1017, pR: 0.0105, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7227, pR: 0.4042, pQ: 0.1825, pS: 0.0673, pF: 0.0269, pC: 0.0091 },
  KOR: { pG: 0.8073, pR: 0.5235, pQ: 0.248, pS: 0.0992, pF: 0.0233, pC: 0.0043 },
  KSA: { pG: 0.218, pR: 0.0998, pQ: 0.0262, pS: 0.0081, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9718, pR: 0.7015, pQ: 0.4278, pS: 0.2912, pF: 0.1334, pC: 0.0599 },
  MEX: { pG: 0.9215, pR: 0.6483, pQ: 0.4205, pS: 0.2082, pF: 0.0756, pC: 0.0254 },
  NED: { pG: 0.8644, pR: 0.5951, pQ: 0.3875, pS: 0.1797, pF: 0.104, pC: 0.0458 },
  NOR: { pG: 0.2875, pR: 0.0653, pQ: 0.0119, pS: 0.0028, pF: 0.0017, pC: 0.0004 },
  NZL: { pG: 0.1473, pR: 0.1037, pQ: 0.0175, pS: 0.0026, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2748, pR: 0.083, pQ: 0.0202, pS: 0.0026, pF: 0.0009, pC: 0.0001 },
  PAR: { pG: 0.3706, pR: 0.1407, pQ: 0.0513, pS: 0.0204, pF: 0.0022, pC: 0.0003 },
  POR: { pG: 0.8565, pR: 0.4627, pQ: 0.2406, pS: 0.0945, pF: 0.0664, pC: 0.0317 },
  QAT: { pG: 0.4187, pR: 0.1884, pQ: 0.0601, pS: 0.0145, pF: 0.0018, pC: 0.0004 },
  RSA: { pG: 0.432, pR: 0.2819, pQ: 0.0919, pS: 0.0231, pF: 0.0023, pC: 0.0004 },
  SCO: { pG: 0.6364, pR: 0.4816, pQ: 0.2041, pS: 0.0747, pF: 0.0105, pC: 0.0014 },
  SEN: { pG: 0.6632, pR: 0.2759, pQ: 0.084, pS: 0.0332, pF: 0.0211, pC: 0.0098 },
  SUI: { pG: 0.8451, pR: 0.5102, pQ: 0.3042, pS: 0.1267, pF: 0.0427, pC: 0.0137 },
  SWE: { pG: 0.3452, pR: 0.1635, pQ: 0.056, pS: 0.0181, pF: 0.0032, pC: 0.0006 },
  TUN: { pG: 0.2796, pR: 0.1248, pQ: 0.0395, pS: 0.012, pF: 0.002, pC: 0.0003 },
  TUR: { pG: 0.6012, pR: 0.2552, pQ: 0.1088, pS: 0.0529, pF: 0.0144, pC: 0.0036 },
  URU: { pG: 0.8195, pR: 0.4451, pQ: 0.151, pS: 0.0721, pF: 0.0321, pC: 0.0117 },
  USA: { pG: 0.7589, pR: 0.3745, pQ: 0.1897, pS: 0.1078, pF: 0.0389, pC: 0.0137 },
  UZB: { pG: 0.1896, pR: 0.0337, pQ: 0.0062, pS: 0.0006, pF: 0.0002, pC: 0.0 },
};
