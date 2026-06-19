// Auto-generated from M2 batch batch_20260619_225315Z on 2026-06-19T22:53:15Z.
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
  ALG: { pG: 0.424, pR: 0.0989, pQ: 0.0177, pS: 0.0041, pF: 0.0011, pC: 0.0003 },
  ARG: { pG: 0.9517, pR: 0.6752, pQ: 0.4148, pS: 0.2608, pF: 0.2121, pC: 0.1358 },
  AUS: { pG: 0.5607, pR: 0.2328, pQ: 0.0971, pS: 0.0471, pF: 0.011, pC: 0.0036 },
  AUT: { pG: 0.5088, pR: 0.1396, pQ: 0.03, pS: 0.0088, pF: 0.0041, pC: 0.0013 },
  BEL: { pG: 0.9726, pR: 0.5673, pQ: 0.2847, pS: 0.1693, pF: 0.0814, pC: 0.0354 },
  BIH: { pG: 0.2712, pR: 0.1062, pQ: 0.0299, pS: 0.008, pF: 0.0006, pC: 0.0 },
  BRA: { pG: 0.9756, pR: 0.7183, pQ: 0.437, pS: 0.2952, pF: 0.1372, pC: 0.0642 },
  CAN: { pG: 0.6873, pR: 0.3396, pQ: 0.1416, pS: 0.0475, pF: 0.0099, pC: 0.0025 },
  CIV: { pG: 0.7622, pR: 0.4635, pQ: 0.1915, pS: 0.0751, pF: 0.0141, pC: 0.0031 },
  COD: { pG: 0.2097, pR: 0.0376, pQ: 0.0067, pS: 0.001, pF: 0.0004, pC: 0.0001 },
  COL: { pG: 0.7448, pR: 0.3267, pQ: 0.1357, pS: 0.0431, pF: 0.0269, pC: 0.0096 },
  CPV: { pG: 0.137, pR: 0.0589, pQ: 0.0125, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7659, pR: 0.4152, pQ: 0.1728, pS: 0.0587, pF: 0.0368, pC: 0.0157 },
  CUW: { pG: 0.1844, pR: 0.1248, pQ: 0.0252, pS: 0.0039, pF: 0.0001, pC: 0.0001 },
  CZE: { pG: 0.6197, pR: 0.4063, pQ: 0.1683, pS: 0.0554, pF: 0.0078, pC: 0.0015 },
  ECU: { pG: 0.8687, pR: 0.4999, pQ: 0.2238, pS: 0.0969, pF: 0.0249, pC: 0.0083 },
  EGY: { pG: 0.8274, pR: 0.4731, pQ: 0.2083, pS: 0.0944, pF: 0.0188, pC: 0.0051 },
  ENG: { pG: 0.9079, pR: 0.6304, pQ: 0.4039, pS: 0.1968, pF: 0.148, pC: 0.0888 },
  ESP: { pG: 0.9789, pR: 0.7811, pQ: 0.5941, pS: 0.4332, pF: 0.3198, pC: 0.1942 },
  FRA: { pG: 0.9337, pR: 0.7012, pQ: 0.4417, pS: 0.2845, pF: 0.2279, pC: 0.146 },
  GER: { pG: 0.9709, pR: 0.622, pQ: 0.3857, pS: 0.1745, pF: 0.0899, pC: 0.0382 },
  GHA: { pG: 0.0484, pR: 0.0037, pQ: 0.0001, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1305, pR: 0.103, pQ: 0.0215, pS: 0.0028, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8938, pR: 0.4699, pQ: 0.2106, pS: 0.1062, pF: 0.027, pC: 0.008 },
  IRQ: { pG: 0.1187, pR: 0.0164, pQ: 0.0014, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1155, pR: 0.0131, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7183, pR: 0.407, pQ: 0.1897, pS: 0.0738, pF: 0.0292, pC: 0.0112 },
  KOR: { pG: 0.8122, pR: 0.5268, pQ: 0.2565, pS: 0.1071, pF: 0.0275, pC: 0.0074 },
  KSA: { pG: 0.2139, pR: 0.0957, pQ: 0.0249, pS: 0.0075, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9735, pR: 0.7032, pQ: 0.4294, pS: 0.2961, pF: 0.1336, pC: 0.0609 },
  MEX: { pG: 0.9223, pR: 0.6528, pQ: 0.4205, pS: 0.1979, pF: 0.0723, pC: 0.025 },
  NED: { pG: 0.8659, pR: 0.5919, pQ: 0.3812, pS: 0.1776, pF: 0.1007, pC: 0.0444 },
  NOR: { pG: 0.2851, pR: 0.0732, pQ: 0.0115, pS: 0.0031, pF: 0.0017, pC: 0.0004 },
  NZL: { pG: 0.1521, pR: 0.1066, pQ: 0.0192, pS: 0.0028, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2778, pR: 0.0832, pQ: 0.0182, pS: 0.0033, pF: 0.0017, pC: 0.0003 },
  PAR: { pG: 0.3595, pR: 0.137, pQ: 0.0505, pS: 0.0197, pF: 0.0042, pC: 0.0012 },
  POR: { pG: 0.8531, pR: 0.4727, pQ: 0.2567, pS: 0.1009, pF: 0.0695, pC: 0.0353 },
  QAT: { pG: 0.4189, pR: 0.1822, pQ: 0.058, pS: 0.0138, pF: 0.0019, pC: 0.0005 },
  RSA: { pG: 0.4267, pR: 0.2773, pQ: 0.0911, pS: 0.0224, pF: 0.0023, pC: 0.0003 },
  SCO: { pG: 0.6319, pR: 0.4799, pQ: 0.208, pS: 0.0815, pF: 0.0115, pC: 0.0017 },
  SEN: { pG: 0.6625, pR: 0.2824, pQ: 0.0826, pS: 0.0345, pF: 0.0208, pC: 0.0084 },
  SUI: { pG: 0.8417, pR: 0.5088, pQ: 0.2976, pS: 0.123, pF: 0.0374, pC: 0.0129 },
  SWE: { pG: 0.3479, pR: 0.1644, pQ: 0.0578, pS: 0.0195, pF: 0.0027, pC: 0.0004 },
  TUN: { pG: 0.2817, pR: 0.1265, pQ: 0.0368, pS: 0.0115, pF: 0.002, pC: 0.0004 },
  TUR: { pG: 0.6039, pR: 0.2558, pQ: 0.1128, pS: 0.0567, pF: 0.0139, pC: 0.0042 },
  URU: { pG: 0.8243, pR: 0.4474, pQ: 0.154, pS: 0.0734, pF: 0.0318, pC: 0.0112 },
  USA: { pG: 0.7644, pR: 0.37, pQ: 0.1802, pS: 0.1024, pF: 0.0344, pC: 0.0121 },
  UZB: { pG: 0.1924, pR: 0.0305, pQ: 0.0059, pS: 0.0002, pF: 0.0001, pC: 0.0 },
};
