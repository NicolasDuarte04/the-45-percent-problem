// Auto-generated from M2 batch batch_20260619_171748Z on 2026-06-19T17:17:48Z.
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
  ALG: { pG: 0.4369, pR: 0.1032, pQ: 0.0171, pS: 0.0043, pF: 0.0021, pC: 0.0002 },
  ARG: { pG: 0.948, pR: 0.6739, pQ: 0.4278, pS: 0.274, pF: 0.2198, pC: 0.1436 },
  AUS: { pG: 0.5628, pR: 0.2344, pQ: 0.0957, pS: 0.0451, pF: 0.0109, pC: 0.0028 },
  AUT: { pG: 0.5045, pR: 0.1408, pQ: 0.0283, pS: 0.0085, pF: 0.0038, pC: 0.001 },
  BEL: { pG: 0.9715, pR: 0.5685, pQ: 0.285, pS: 0.1705, pF: 0.0834, pC: 0.0389 },
  BIH: { pG: 0.2737, pR: 0.105, pQ: 0.0259, pS: 0.0055, pF: 0.0006, pC: 0.0001 },
  BRA: { pG: 0.9759, pR: 0.7113, pQ: 0.4363, pS: 0.3022, pF: 0.136, pC: 0.0646 },
  CAN: { pG: 0.675, pR: 0.3366, pQ: 0.1487, pS: 0.0493, pF: 0.0102, pC: 0.0021 },
  CIV: { pG: 0.7674, pR: 0.4742, pQ: 0.1952, pS: 0.0787, pF: 0.0144, pC: 0.0034 },
  COD: { pG: 0.2151, pR: 0.0397, pQ: 0.007, pS: 0.0007, pF: 0.0003, pC: 0.0001 },
  COL: { pG: 0.7393, pR: 0.323, pQ: 0.1334, pS: 0.041, pF: 0.0243, pC: 0.0093 },
  CPV: { pG: 0.1292, pR: 0.0545, pQ: 0.0127, pS: 0.0031, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7598, pR: 0.4107, pQ: 0.1735, pS: 0.0556, pF: 0.0354, pC: 0.0155 },
  CUW: { pG: 0.1759, pR: 0.119, pQ: 0.0264, pS: 0.0045, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6177, pR: 0.4023, pQ: 0.1555, pS: 0.0538, pF: 0.009, pC: 0.0012 },
  ECU: { pG: 0.8732, pR: 0.5029, pQ: 0.233, pS: 0.0992, pF: 0.0265, pC: 0.008 },
  EGY: { pG: 0.8285, pR: 0.4796, pQ: 0.215, pS: 0.101, pF: 0.0214, pC: 0.005 },
  ENG: { pG: 0.91, pR: 0.6273, pQ: 0.4099, pS: 0.2015, pF: 0.1525, pC: 0.0807 },
  ESP: { pG: 0.9785, pR: 0.7826, pQ: 0.5937, pS: 0.43, pF: 0.3139, pC: 0.1957 },
  FRA: { pG: 0.9299, pR: 0.6986, pQ: 0.426, pS: 0.2754, pF: 0.222, pC: 0.1462 },
  GER: { pG: 0.9704, pR: 0.627, pQ: 0.3822, pS: 0.1751, pF: 0.0882, pC: 0.0382 },
  GHA: { pG: 0.0486, pR: 0.0069, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1286, pR: 0.1026, pQ: 0.024, pS: 0.0051, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8922, pR: 0.4699, pQ: 0.2089, pS: 0.1092, pF: 0.0306, pC: 0.0096 },
  IRQ: { pG: 0.1156, pR: 0.017, pQ: 0.0014, pS: 0.0002, pF: 0.0002, pC: 0.0001 },
  JOR: { pG: 0.1106, pR: 0.0115, pQ: 0.0008, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7131, pR: 0.403, pQ: 0.1853, pS: 0.0689, pF: 0.0286, pC: 0.011 },
  KOR: { pG: 0.8126, pR: 0.5236, pQ: 0.2525, pS: 0.0997, pF: 0.0254, pC: 0.006 },
  KSA: { pG: 0.2177, pR: 0.0964, pQ: 0.0253, pS: 0.0069, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9723, pR: 0.709, pQ: 0.4294, pS: 0.2898, pF: 0.1321, pC: 0.0597 },
  MEX: { pG: 0.922, pR: 0.6649, pQ: 0.4306, pS: 0.2044, pF: 0.075, pC: 0.0268 },
  NED: { pG: 0.8683, pR: 0.5851, pQ: 0.3839, pS: 0.1738, pF: 0.0989, pC: 0.0442 },
  NOR: { pG: 0.2846, pR: 0.0727, pQ: 0.0125, pS: 0.0027, pF: 0.0012, pC: 0.0003 },
  NZL: { pG: 0.1547, pR: 0.1121, pQ: 0.0197, pS: 0.0037, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2816, pR: 0.0821, pQ: 0.0181, pS: 0.0017, pF: 0.0005, pC: 0.0002 },
  PAR: { pG: 0.3676, pR: 0.1438, pQ: 0.0562, pS: 0.0201, pF: 0.0032, pC: 0.0007 },
  POR: { pG: 0.8571, pR: 0.4758, pQ: 0.2521, pS: 0.1009, pF: 0.0683, pC: 0.0339 },
  QAT: { pG: 0.4237, pR: 0.1844, pQ: 0.0543, pS: 0.014, pF: 0.0019, pC: 0.0001 },
  RSA: { pG: 0.4354, pR: 0.2825, pQ: 0.0945, pS: 0.0273, pF: 0.003, pC: 0.0003 },
  SCO: { pG: 0.6342, pR: 0.485, pQ: 0.2098, pS: 0.0789, pF: 0.0101, pC: 0.0016 },
  SEN: { pG: 0.6699, pR: 0.2823, pQ: 0.0861, pS: 0.0331, pF: 0.0199, pC: 0.0075 },
  SUI: { pG: 0.8399, pR: 0.5007, pQ: 0.2903, pS: 0.1221, pF: 0.0403, pC: 0.0127 },
  SWE: { pG: 0.3477, pR: 0.1638, pQ: 0.0556, pS: 0.0178, pF: 0.003, pC: 0.0009 },
  TUN: { pG: 0.284, pR: 0.125, pQ: 0.0369, pS: 0.0109, pF: 0.0013, pC: 0.0001 },
  TUR: { pG: 0.5992, pR: 0.2521, pQ: 0.1115, pS: 0.0557, pF: 0.015, pC: 0.004 },
  URU: { pG: 0.8277, pR: 0.4364, pQ: 0.1412, pS: 0.0682, pF: 0.0309, pC: 0.011 },
  USA: { pG: 0.7594, pR: 0.3618, pQ: 0.1848, pS: 0.1055, pF: 0.0349, pC: 0.0126 },
  UZB: { pG: 0.1885, pR: 0.0345, pQ: 0.0052, pS: 0.0003, pF: 0.0001, pC: 0.0001 },
};
