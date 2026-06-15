// Auto-generated from M2 batch batch_20260615_023320Z on 2026-06-15T02:33:20Z.
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
  ALG: { pG: 0.4286, pR: 0.1031, pQ: 0.0188, pS: 0.0052, pF: 0.0026, pC: 0.0007 },
  ARG: { pG: 0.9524, pR: 0.6705, pQ: 0.4202, pS: 0.2736, pF: 0.2212, pC: 0.1423 },
  AUS: { pG: 0.5486, pR: 0.2176, pQ: 0.0958, pS: 0.045, pF: 0.0098, pC: 0.0023 },
  AUT: { pG: 0.5098, pR: 0.141, pQ: 0.0292, pS: 0.0092, pF: 0.0041, pC: 0.001 },
  BEL: { pG: 0.9735, pR: 0.5683, pQ: 0.2852, pS: 0.167, pF: 0.0828, pC: 0.0358 },
  BIH: { pG: 0.2713, pR: 0.1085, pQ: 0.0264, pS: 0.0053, pF: 0.0005, pC: 0.0 },
  BRA: { pG: 0.9715, pR: 0.7189, pQ: 0.4399, pS: 0.3004, pF: 0.1385, pC: 0.0633 },
  CAN: { pG: 0.6791, pR: 0.3354, pQ: 0.1475, pS: 0.049, pF: 0.0123, pC: 0.003 },
  CIV: { pG: 0.7668, pR: 0.4659, pQ: 0.1918, pS: 0.0755, pF: 0.0135, pC: 0.0038 },
  COD: { pG: 0.205, pR: 0.0397, pQ: 0.0054, pS: 0.0005, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7496, pR: 0.3277, pQ: 0.1332, pS: 0.0422, pF: 0.0254, pC: 0.0101 },
  CPV: { pG: 0.1361, pR: 0.0594, pQ: 0.0127, pS: 0.0035, pF: 0.0005, pC: 0.0001 },
  CRO: { pG: 0.7633, pR: 0.413, pQ: 0.1771, pS: 0.0584, pF: 0.0401, pC: 0.0167 },
  CUW: { pG: 0.1831, pR: 0.1252, pQ: 0.0218, pS: 0.0049, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6212, pR: 0.401, pQ: 0.1654, pS: 0.0596, pF: 0.0088, pC: 0.0013 },
  ECU: { pG: 0.8692, pR: 0.5027, pQ: 0.2315, pS: 0.0965, pF: 0.0251, pC: 0.0068 },
  EGY: { pG: 0.8269, pR: 0.4798, pQ: 0.2159, pS: 0.1005, pF: 0.0196, pC: 0.0059 },
  ENG: { pG: 0.9058, pR: 0.6248, pQ: 0.41, pS: 0.1988, pF: 0.1521, pC: 0.0888 },
  ESP: { pG: 0.9772, pR: 0.772, pQ: 0.5845, pS: 0.4241, pF: 0.3087, pC: 0.1872 },
  FRA: { pG: 0.9349, pR: 0.7045, pQ: 0.4364, pS: 0.2729, pF: 0.2201, pC: 0.1444 },
  GER: { pG: 0.9668, pR: 0.6236, pQ: 0.3799, pS: 0.1732, pF: 0.0875, pC: 0.035 },
  GHA: { pG: 0.0488, pR: 0.0056, pQ: 0.0005, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1311, pR: 0.1031, pQ: 0.0226, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8907, pR: 0.4795, pQ: 0.2206, pS: 0.1101, pF: 0.0324, pC: 0.0103 },
  IRQ: { pG: 0.1124, pR: 0.0152, pQ: 0.0008, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1092, pR: 0.0101, pQ: 0.001, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7239, pR: 0.4093, pQ: 0.1904, pS: 0.0716, pF: 0.0275, pC: 0.0092 },
  KOR: { pG: 0.8102, pR: 0.5296, pQ: 0.2554, pS: 0.1055, pF: 0.0247, pC: 0.0069 },
  KSA: { pG: 0.2128, pR: 0.0923, pQ: 0.0252, pS: 0.0075, pF: 0.0009, pC: 0.0001 },
  MAR: { pG: 0.9698, pR: 0.7004, pQ: 0.4168, pS: 0.2857, pF: 0.1266, pC: 0.0579 },
  MEX: { pG: 0.9254, pR: 0.6556, pQ: 0.4231, pS: 0.2009, pF: 0.0726, pC: 0.0272 },
  NED: { pG: 0.8687, pR: 0.5897, pQ: 0.3791, pS: 0.1774, pF: 0.1011, pC: 0.0483 },
  NOR: { pG: 0.2841, pR: 0.0748, pQ: 0.0141, pS: 0.0025, pF: 0.0007, pC: 0.0002 },
  NZL: { pG: 0.1566, pR: 0.1112, pQ: 0.0216, pS: 0.0043, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2821, pR: 0.0788, pQ: 0.0149, pS: 0.0021, pF: 0.001, pC: 0.0003 },
  PAR: { pG: 0.3683, pR: 0.1414, pQ: 0.0514, pS: 0.0202, pF: 0.0036, pC: 0.0006 },
  POR: { pG: 0.8588, pR: 0.4796, pQ: 0.254, pS: 0.1006, pF: 0.0716, pC: 0.0359 },
  QAT: { pG: 0.4192, pR: 0.1854, pQ: 0.0587, pS: 0.015, pF: 0.0021, pC: 0.0003 },
  RSA: { pG: 0.4256, pR: 0.273, pQ: 0.0869, pS: 0.0229, pF: 0.0025, pC: 0.0003 },
  SCO: { pG: 0.6462, pR: 0.4969, pQ: 0.2121, pS: 0.0844, pF: 0.0132, pC: 0.0026 },
  SEN: { pG: 0.6686, pR: 0.2808, pQ: 0.0795, pS: 0.0335, pF: 0.0199, pC: 0.0088 },
  SUI: { pG: 0.848, pR: 0.5115, pQ: 0.3006, pS: 0.1243, pF: 0.0404, pC: 0.0144 },
  SWE: { pG: 0.3428, pR: 0.1581, pQ: 0.0548, pS: 0.0169, pF: 0.0029, pC: 0.0008 },
  TUN: { pG: 0.2787, pR: 0.1255, pQ: 0.0394, pS: 0.0145, pF: 0.0015, pC: 0.0002 },
  TUR: { pG: 0.6069, pR: 0.2596, pQ: 0.1177, pS: 0.0588, pF: 0.014, pC: 0.0039 },
  URU: { pG: 0.8262, pR: 0.4375, pQ: 0.1456, pS: 0.0698, pF: 0.0307, pC: 0.0111 },
  USA: { pG: 0.7576, pR: 0.3621, pQ: 0.1797, pS: 0.1026, pF: 0.0362, pC: 0.0122 },
  UZB: { pG: 0.1866, pR: 0.0308, pQ: 0.0049, pS: 0.0001, pF: 0.0, pC: 0.0 },
};
