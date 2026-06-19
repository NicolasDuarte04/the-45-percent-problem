// Auto-generated from M2 batch batch_20260619_145622Z on 2026-06-19T14:56:22Z.
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
  ALG: { pG: 0.4324, pR: 0.1041, pQ: 0.018, pS: 0.0039, pF: 0.0018, pC: 0.0002 },
  ARG: { pG: 0.9507, pR: 0.6757, pQ: 0.4163, pS: 0.2666, pF: 0.2163, pC: 0.1401 },
  AUS: { pG: 0.5597, pR: 0.2284, pQ: 0.0962, pS: 0.0454, pF: 0.0107, pC: 0.0028 },
  AUT: { pG: 0.5117, pR: 0.1375, pQ: 0.0274, pS: 0.0076, pF: 0.0038, pC: 0.0013 },
  BEL: { pG: 0.9736, pR: 0.5653, pQ: 0.2885, pS: 0.1732, pF: 0.0817, pC: 0.035 },
  BIH: { pG: 0.275, pR: 0.1066, pQ: 0.0271, pS: 0.0056, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.976, pR: 0.7184, pQ: 0.4414, pS: 0.3027, pF: 0.1457, pC: 0.0666 },
  CAN: { pG: 0.6811, pR: 0.3422, pQ: 0.1481, pS: 0.0491, pF: 0.0104, pC: 0.0021 },
  CIV: { pG: 0.7718, pR: 0.4673, pQ: 0.1979, pS: 0.0815, pF: 0.0138, pC: 0.0037 },
  COD: { pG: 0.2028, pR: 0.0359, pQ: 0.006, pS: 0.0006, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7479, pR: 0.3309, pQ: 0.1358, pS: 0.043, pF: 0.0275, pC: 0.0107 },
  CPV: { pG: 0.1354, pR: 0.0601, pQ: 0.0112, pS: 0.0025, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7616, pR: 0.4087, pQ: 0.1682, pS: 0.057, pF: 0.0361, pC: 0.0151 },
  CUW: { pG: 0.1752, pR: 0.1182, pQ: 0.0227, pS: 0.0035, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6248, pR: 0.4052, pQ: 0.1556, pS: 0.0528, pF: 0.0079, pC: 0.0017 },
  ECU: { pG: 0.8727, pR: 0.5023, pQ: 0.2196, pS: 0.091, pF: 0.0235, pC: 0.0069 },
  EGY: { pG: 0.8242, pR: 0.4759, pQ: 0.2102, pS: 0.0947, pF: 0.0187, pC: 0.005 },
  ENG: { pG: 0.9114, pR: 0.6342, pQ: 0.418, pS: 0.1993, pF: 0.1485, pC: 0.0872 },
  ESP: { pG: 0.9784, pR: 0.7735, pQ: 0.5924, pS: 0.4296, pF: 0.3081, pC: 0.188 },
  FRA: { pG: 0.9302, pR: 0.6992, pQ: 0.4398, pS: 0.2847, pF: 0.2297, pC: 0.1513 },
  GER: { pG: 0.9699, pR: 0.6181, pQ: 0.3811, pS: 0.176, pF: 0.0873, pC: 0.0372 },
  GHA: { pG: 0.0484, pR: 0.0063, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1328, pR: 0.1055, pQ: 0.0234, pS: 0.0053, pF: 0.0004, pC: 0.0 },
  IRN: { pG: 0.8934, pR: 0.4676, pQ: 0.212, pS: 0.1026, pF: 0.0277, pC: 0.0074 },
  IRQ: { pG: 0.1214, pR: 0.0171, pQ: 0.0026, pS: 0.0004, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1052, pR: 0.0127, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7199, pR: 0.411, pQ: 0.1921, pS: 0.0705, pF: 0.0298, pC: 0.0095 },
  KOR: { pG: 0.8047, pR: 0.5211, pQ: 0.2498, pS: 0.0982, pF: 0.0244, pC: 0.0071 },
  KSA: { pG: 0.2172, pR: 0.0991, pQ: 0.0258, pS: 0.0077, pF: 0.001, pC: 0.0002 },
  MAR: { pG: 0.9718, pR: 0.7113, pQ: 0.4339, pS: 0.2951, pF: 0.1329, pC: 0.0614 },
  MEX: { pG: 0.9163, pR: 0.6493, pQ: 0.4236, pS: 0.1998, pF: 0.0722, pC: 0.0255 },
  NED: { pG: 0.8703, pR: 0.6014, pQ: 0.3874, pS: 0.1812, pF: 0.101, pC: 0.0451 },
  NOR: { pG: 0.2841, pR: 0.0729, pQ: 0.0141, pS: 0.003, pF: 0.0012, pC: 0.0005 },
  NZL: { pG: 0.1515, pR: 0.1099, pQ: 0.0216, pS: 0.0046, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2786, pR: 0.0849, pQ: 0.0178, pS: 0.0024, pF: 0.0009, pC: 0.0002 },
  PAR: { pG: 0.3646, pR: 0.1436, pQ: 0.051, pS: 0.0196, pF: 0.0029, pC: 0.0006 },
  POR: { pG: 0.8574, pR: 0.4655, pQ: 0.2486, pS: 0.0955, pF: 0.0646, pC: 0.0319 },
  QAT: { pG: 0.4259, pR: 0.1859, pQ: 0.0629, pS: 0.0163, pF: 0.002, pC: 0.0003 },
  RSA: { pG: 0.4277, pR: 0.2785, pQ: 0.0872, pS: 0.0234, pF: 0.0019, pC: 0.0001 },
  SCO: { pG: 0.6271, pR: 0.4813, pQ: 0.2045, pS: 0.08, pF: 0.0106, pC: 0.0015 },
  SEN: { pG: 0.6643, pR: 0.2808, pQ: 0.0811, pS: 0.0355, pF: 0.0219, pC: 0.0096 },
  SUI: { pG: 0.8445, pR: 0.5112, pQ: 0.3032, pS: 0.1303, pF: 0.0421, pC: 0.0149 },
  SWE: { pG: 0.3456, pR: 0.1629, pQ: 0.055, pS: 0.0161, pF: 0.003, pC: 0.0006 },
  TUN: { pG: 0.2746, pR: 0.1188, pQ: 0.037, pS: 0.0106, pF: 0.0016, pC: 0.0001 },
  TUR: { pG: 0.6039, pR: 0.2525, pQ: 0.1109, pS: 0.0559, pF: 0.0152, pC: 0.0045 },
  URU: { pG: 0.8263, pR: 0.4486, pQ: 0.1455, pS: 0.0711, pF: 0.0323, pC: 0.0099 },
  USA: { pG: 0.7641, pR: 0.359, pQ: 0.1812, pS: 0.1041, pF: 0.0375, pC: 0.014 },
  UZB: { pG: 0.1919, pR: 0.0336, pQ: 0.005, pS: 0.0005, pF: 0.0002, pC: 0.0001 },
};
