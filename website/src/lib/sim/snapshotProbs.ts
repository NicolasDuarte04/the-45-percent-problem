// Auto-generated from M2 batch batch_20260616_063206Z on 2026-06-16T06:32:06Z.
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
  ALG: { pG: 0.4191, pR: 0.0965, pQ: 0.0153, pS: 0.0044, pF: 0.0022, pC: 0.0004 },
  ARG: { pG: 0.9557, pR: 0.6774, pQ: 0.4158, pS: 0.2659, pF: 0.2146, pC: 0.1429 },
  AUS: { pG: 0.5685, pR: 0.2324, pQ: 0.0988, pS: 0.0445, pF: 0.0099, pC: 0.0024 },
  AUT: { pG: 0.5188, pR: 0.1406, pQ: 0.0292, pS: 0.0068, pF: 0.0036, pC: 0.0006 },
  BEL: { pG: 0.9736, pR: 0.5611, pQ: 0.2823, pS: 0.1693, pF: 0.0817, pC: 0.0343 },
  BIH: { pG: 0.2669, pR: 0.1048, pQ: 0.028, pS: 0.006, pF: 0.0006, pC: 0.0001 },
  BRA: { pG: 0.9748, pR: 0.7192, pQ: 0.4398, pS: 0.3016, pF: 0.1354, pC: 0.0648 },
  CAN: { pG: 0.6793, pR: 0.3355, pQ: 0.1463, pS: 0.0486, pF: 0.0109, pC: 0.0022 },
  CIV: { pG: 0.7686, pR: 0.4704, pQ: 0.1932, pS: 0.077, pF: 0.0125, pC: 0.0027 },
  COD: { pG: 0.2089, pR: 0.0389, pQ: 0.0063, pS: 0.0008, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7467, pR: 0.3308, pQ: 0.133, pS: 0.0432, pF: 0.0257, pC: 0.0099 },
  CPV: { pG: 0.1273, pR: 0.0546, pQ: 0.0109, pS: 0.0016, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7613, pR: 0.4113, pQ: 0.1762, pS: 0.0614, pF: 0.0412, pC: 0.018 },
  CUW: { pG: 0.1746, pR: 0.1193, pQ: 0.0229, pS: 0.0039, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6208, pR: 0.4027, pQ: 0.1587, pS: 0.0558, pF: 0.0086, pC: 0.0014 },
  ECU: { pG: 0.8807, pR: 0.5085, pQ: 0.234, pS: 0.0927, pF: 0.0237, pC: 0.0063 },
  EGY: { pG: 0.8282, pR: 0.4786, pQ: 0.212, pS: 0.1001, pF: 0.0188, pC: 0.0056 },
  ENG: { pG: 0.9049, pR: 0.6304, pQ: 0.4087, pS: 0.1944, pF: 0.1483, pC: 0.084 },
  ESP: { pG: 0.9819, pR: 0.7801, pQ: 0.5883, pS: 0.4206, pF: 0.3054, pC: 0.184 },
  FRA: { pG: 0.9372, pR: 0.7142, pQ: 0.4445, pS: 0.2864, pF: 0.2307, pC: 0.1523 },
  GER: { pG: 0.97, pR: 0.621, pQ: 0.3838, pS: 0.1804, pF: 0.0927, pC: 0.0378 },
  GHA: { pG: 0.0514, pR: 0.0073, pQ: 0.0012, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1285, pR: 0.1039, pQ: 0.022, pS: 0.003, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8941, pR: 0.4713, pQ: 0.2166, pS: 0.1116, pF: 0.029, pC: 0.0084 },
  IRQ: { pG: 0.1197, pR: 0.0155, pQ: 0.0012, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1064, pR: 0.0086, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7119, pR: 0.3954, pQ: 0.1777, pS: 0.0637, pF: 0.0281, pC: 0.0108 },
  KOR: { pG: 0.8073, pR: 0.5379, pQ: 0.2602, pS: 0.1055, pF: 0.0265, pC: 0.0061 },
  KSA: { pG: 0.2029, pR: 0.0924, pQ: 0.0241, pS: 0.0068, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9728, pR: 0.7074, pQ: 0.4245, pS: 0.2872, pF: 0.1301, pC: 0.0617 },
  MEX: { pG: 0.9266, pR: 0.6593, pQ: 0.4346, pS: 0.2102, pF: 0.0746, pC: 0.0274 },
  NED: { pG: 0.8653, pR: 0.5944, pQ: 0.3887, pS: 0.1794, pF: 0.0983, pC: 0.0446 },
  NOR: { pG: 0.2844, pR: 0.0699, pQ: 0.0128, pS: 0.0033, pF: 0.0016, pC: 0.0006 },
  NZL: { pG: 0.1587, pR: 0.1151, pQ: 0.0227, pS: 0.0049, pF: 0.0003, pC: 0.0001 },
  PAN: { pG: 0.2824, pR: 0.0819, pQ: 0.0185, pS: 0.004, pF: 0.0021, pC: 0.0003 },
  PAR: { pG: 0.3662, pR: 0.1375, pQ: 0.0482, pS: 0.0177, pF: 0.0031, pC: 0.0005 },
  POR: { pG: 0.8591, pR: 0.4681, pQ: 0.2505, pS: 0.1009, pF: 0.0694, pC: 0.0351 },
  QAT: { pG: 0.4244, pR: 0.1823, pQ: 0.0602, pS: 0.0139, pF: 0.0019, pC: 0.0005 },
  RSA: { pG: 0.4255, pR: 0.2717, pQ: 0.0851, pS: 0.0234, pF: 0.0025, pC: 0.0001 },
  SCO: { pG: 0.6339, pR: 0.4808, pQ: 0.202, pS: 0.0775, pF: 0.0117, pC: 0.0029 },
  SEN: { pG: 0.6587, pR: 0.2773, pQ: 0.0808, pS: 0.0278, pF: 0.0165, pC: 0.0064 },
  SUI: { pG: 0.8492, pR: 0.5058, pQ: 0.2925, pS: 0.1248, pF: 0.0448, pC: 0.0149 },
  SWE: { pG: 0.3501, pR: 0.1666, pQ: 0.0556, pS: 0.0169, pF: 0.0039, pC: 0.0007 },
  TUN: { pG: 0.2788, pR: 0.1244, pQ: 0.0381, pS: 0.012, pF: 0.0017, pC: 0.0002 },
  TUR: { pG: 0.5919, pR: 0.2522, pQ: 0.1125, pS: 0.0563, pF: 0.0133, pC: 0.003 },
  URU: { pG: 0.8333, pR: 0.4468, pQ: 0.1491, pS: 0.0765, pF: 0.0342, pC: 0.0122 },
  USA: { pG: 0.7634, pR: 0.3666, pQ: 0.1866, pS: 0.1066, pF: 0.0388, pC: 0.0137 },
  UZB: { pG: 0.1853, pR: 0.0313, pQ: 0.0056, pS: 0.0006, pF: 0.0, pC: 0.0 },
};
