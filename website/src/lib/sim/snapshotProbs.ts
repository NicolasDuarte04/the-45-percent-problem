// Auto-generated from M2 batch batch_20260612_033206Z on 2026-06-12T03:32:06Z.
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
  ALG: { pG: 0.4158, pR: 0.0966, pQ: 0.0187, pS: 0.0041, pF: 0.0028, pC: 0.0009 },
  ARG: { pG: 0.9505, pR: 0.6805, pQ: 0.4196, pS: 0.2726, pF: 0.2225, pC: 0.1433 },
  AUS: { pG: 0.5519, pR: 0.2307, pQ: 0.0999, pS: 0.0467, pF: 0.0104, pC: 0.0024 },
  AUT: { pG: 0.5235, pR: 0.1423, pQ: 0.0306, pS: 0.0087, pF: 0.0046, pC: 0.001 },
  BEL: { pG: 0.9714, pR: 0.5692, pQ: 0.2905, pS: 0.1708, pF: 0.0842, pC: 0.0366 },
  BIH: { pG: 0.2677, pR: 0.1072, pQ: 0.0284, pS: 0.0052, pF: 0.0007, pC: 0.0 },
  BRA: { pG: 0.9762, pR: 0.7094, pQ: 0.4372, pS: 0.3036, pF: 0.1414, pC: 0.0655 },
  CAN: { pG: 0.6828, pR: 0.3355, pQ: 0.1419, pS: 0.0475, pF: 0.0103, pC: 0.0021 },
  CIV: { pG: 0.7657, pR: 0.4624, pQ: 0.1897, pS: 0.0733, pF: 0.0108, pC: 0.002 },
  COD: { pG: 0.203, pR: 0.0363, pQ: 0.0057, pS: 0.0007, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7462, pR: 0.3263, pQ: 0.1373, pS: 0.0451, pF: 0.0283, pC: 0.0115 },
  CPV: { pG: 0.1307, pR: 0.0543, pQ: 0.0122, pS: 0.0035, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7613, pR: 0.4036, pQ: 0.1694, pS: 0.0602, pF: 0.0386, pC: 0.0182 },
  CUW: { pG: 0.1864, pR: 0.124, pQ: 0.0258, pS: 0.0046, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6242, pR: 0.4071, pQ: 0.1604, pS: 0.0542, pF: 0.0059, pC: 0.001 },
  ECU: { pG: 0.8669, pR: 0.5017, pQ: 0.2299, pS: 0.0904, pF: 0.0222, pC: 0.0068 },
  EGY: { pG: 0.8287, pR: 0.478, pQ: 0.2085, pS: 0.0956, pF: 0.0192, pC: 0.0041 },
  ENG: { pG: 0.9028, pR: 0.6339, pQ: 0.4125, pS: 0.1924, pF: 0.1472, pC: 0.0849 },
  ESP: { pG: 0.9785, pR: 0.769, pQ: 0.5738, pS: 0.4165, pF: 0.3059, pC: 0.1886 },
  FRA: { pG: 0.9316, pR: 0.7045, pQ: 0.4363, pS: 0.2854, pF: 0.2337, pC: 0.149 },
  GER: { pG: 0.9676, pR: 0.6264, pQ: 0.3874, pS: 0.1833, pF: 0.0892, pC: 0.0387 },
  GHA: { pG: 0.0504, pR: 0.0064, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1354, pR: 0.1062, pQ: 0.0249, pS: 0.0038, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8982, pR: 0.4807, pQ: 0.2203, pS: 0.1089, pF: 0.0289, pC: 0.0085 },
  IRQ: { pG: 0.1192, pR: 0.0177, pQ: 0.0019, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1102, pR: 0.0099, pQ: 0.0012, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7199, pR: 0.4056, pQ: 0.1907, pS: 0.0689, pF: 0.0273, pC: 0.0098 },
  KOR: { pG: 0.8009, pR: 0.5204, pQ: 0.2553, pS: 0.1053, pF: 0.0241, pC: 0.0068 },
  KSA: { pG: 0.2118, pR: 0.0921, pQ: 0.0243, pS: 0.0075, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9702, pR: 0.7143, pQ: 0.4315, pS: 0.2932, pF: 0.1359, pC: 0.0602 },
  MEX: { pG: 0.9219, pR: 0.6544, pQ: 0.4198, pS: 0.2045, pF: 0.074, pC: 0.0276 },
  NED: { pG: 0.8644, pR: 0.5908, pQ: 0.3757, pS: 0.1767, pF: 0.0989, pC: 0.0469 },
  NOR: { pG: 0.2813, pR: 0.067, pQ: 0.0111, pS: 0.0034, pF: 0.001, pC: 0.0002 },
  NZL: { pG: 0.1541, pR: 0.1122, pQ: 0.0195, pS: 0.003, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2855, pR: 0.0857, pQ: 0.0178, pS: 0.0021, pF: 0.001, pC: 0.0 },
  PAR: { pG: 0.3697, pR: 0.1385, pQ: 0.0498, pS: 0.0197, pF: 0.0034, pC: 0.0004 },
  POR: { pG: 0.8573, pR: 0.4788, pQ: 0.2518, pS: 0.0923, pF: 0.0649, pC: 0.0302 },
  QAT: { pG: 0.4221, pR: 0.1844, pQ: 0.0561, pS: 0.0126, pF: 0.0012, pC: 0.0002 },
  RSA: { pG: 0.4367, pR: 0.2798, pQ: 0.0869, pS: 0.0249, pF: 0.0022, pC: 0.0003 },
  SCO: { pG: 0.6336, pR: 0.4831, pQ: 0.2116, pS: 0.0818, pF: 0.0107, pC: 0.0025 },
  SEN: { pG: 0.6679, pR: 0.2815, pQ: 0.0806, pS: 0.0321, pF: 0.0188, pC: 0.0069 },
  SUI: { pG: 0.8437, pR: 0.5112, pQ: 0.3002, pS: 0.1286, pF: 0.0419, pC: 0.013 },
  SWE: { pG: 0.345, pR: 0.1582, pQ: 0.0533, pS: 0.0175, pF: 0.0032, pC: 0.0009 },
  TUN: { pG: 0.2841, pR: 0.1309, pQ: 0.0413, pS: 0.0126, pF: 0.0021, pC: 0.0002 },
  TUR: { pG: 0.6015, pR: 0.2517, pQ: 0.1118, pS: 0.0553, pF: 0.0125, pC: 0.004 },
  URU: { pG: 0.8266, pR: 0.4445, pQ: 0.1571, pS: 0.0766, pF: 0.0335, pC: 0.0128 },
  USA: { pG: 0.7615, pR: 0.3661, pQ: 0.1843, pS: 0.1034, pF: 0.0352, pC: 0.012 },
  UZB: { pG: 0.1935, pR: 0.029, pQ: 0.0051, pS: 0.0005, pF: 0.0, pC: 0.0 },
};
