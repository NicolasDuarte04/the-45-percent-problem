// Auto-generated from M2 batch batch_20260618_192521Z on 2026-06-18T19:25:21Z.
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
  ALG: { pG: 0.4224, pR: 0.0988, pQ: 0.0187, pS: 0.006, pF: 0.0033, pC: 0.0007 },
  ARG: { pG: 0.9561, pR: 0.6801, pQ: 0.4212, pS: 0.2769, pF: 0.221, pC: 0.1444 },
  AUS: { pG: 0.5479, pR: 0.2305, pQ: 0.094, pS: 0.0434, pF: 0.0118, pC: 0.0026 },
  AUT: { pG: 0.5111, pR: 0.1396, pQ: 0.0257, pS: 0.0078, pF: 0.0039, pC: 0.0011 },
  BEL: { pG: 0.9725, pR: 0.567, pQ: 0.2892, pS: 0.1746, pF: 0.0816, pC: 0.0373 },
  BIH: { pG: 0.268, pR: 0.1098, pQ: 0.0304, pS: 0.008, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9726, pR: 0.7083, pQ: 0.4327, pS: 0.2987, pF: 0.1415, pC: 0.0674 },
  CAN: { pG: 0.6879, pR: 0.3443, pQ: 0.15, pS: 0.0519, pF: 0.0117, pC: 0.0029 },
  CIV: { pG: 0.7707, pR: 0.4794, pQ: 0.1992, pS: 0.0771, pF: 0.014, pC: 0.0026 },
  COD: { pG: 0.2136, pR: 0.0382, pQ: 0.0074, pS: 0.0009, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7412, pR: 0.3291, pQ: 0.132, pS: 0.038, pF: 0.0223, pC: 0.0089 },
  CPV: { pG: 0.1308, pR: 0.0542, pQ: 0.0137, pS: 0.0048, pF: 0.0004, pC: 0.0001 },
  CRO: { pG: 0.7647, pR: 0.4078, pQ: 0.1708, pS: 0.0596, pF: 0.0368, pC: 0.016 },
  CUW: { pG: 0.1711, pR: 0.1145, pQ: 0.0219, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6242, pR: 0.4058, pQ: 0.158, pS: 0.0497, pF: 0.0067, pC: 0.0011 },
  ECU: { pG: 0.871, pR: 0.4902, pQ: 0.2201, pS: 0.0887, pF: 0.0243, pC: 0.0066 },
  EGY: { pG: 0.832, pR: 0.4811, pQ: 0.2107, pS: 0.0978, pF: 0.0221, pC: 0.0049 },
  ENG: { pG: 0.9093, pR: 0.6324, pQ: 0.4124, pS: 0.1941, pF: 0.1434, pC: 0.0812 },
  ESP: { pG: 0.9819, pR: 0.7749, pQ: 0.589, pS: 0.4236, pF: 0.3076, pC: 0.1892 },
  FRA: { pG: 0.932, pR: 0.7037, pQ: 0.4378, pS: 0.2823, pF: 0.2286, pC: 0.1459 },
  GER: { pG: 0.9725, pR: 0.6279, pQ: 0.385, pS: 0.1792, pF: 0.0904, pC: 0.0378 },
  GHA: { pG: 0.0482, pR: 0.006, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1379, pR: 0.1089, pQ: 0.025, pS: 0.0045, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8962, pR: 0.4804, pQ: 0.2201, pS: 0.1089, pF: 0.0302, pC: 0.0088 },
  IRQ: { pG: 0.1181, pR: 0.0203, pQ: 0.0017, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1104, pR: 0.0104, pQ: 0.0007, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7061, pR: 0.3991, pQ: 0.1842, pS: 0.0701, pF: 0.0297, pC: 0.0086 },
  KOR: { pG: 0.8019, pR: 0.521, pQ: 0.2564, pS: 0.103, pF: 0.0258, pC: 0.0079 },
  KSA: { pG: 0.2171, pR: 0.0936, pQ: 0.0267, pS: 0.0096, pF: 0.0011, pC: 0.0002 },
  MAR: { pG: 0.9713, pR: 0.7017, pQ: 0.4226, pS: 0.2902, pF: 0.1307, pC: 0.061 },
  MEX: { pG: 0.9236, pR: 0.6485, pQ: 0.419, pS: 0.2066, pF: 0.0682, pC: 0.0246 },
  NED: { pG: 0.8712, pR: 0.5935, pQ: 0.3785, pS: 0.1774, pF: 0.1043, pC: 0.05 },
  NOR: { pG: 0.2912, pR: 0.0721, pQ: 0.0134, pS: 0.0024, pF: 0.0012, pC: 0.0002 },
  NZL: { pG: 0.153, pR: 0.109, pQ: 0.0203, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2778, pR: 0.0813, pQ: 0.0187, pS: 0.0027, pF: 0.0007, pC: 0.0002 },
  PAR: { pG: 0.3733, pR: 0.1452, pQ: 0.0555, pS: 0.0203, pF: 0.003, pC: 0.0005 },
  POR: { pG: 0.8569, pR: 0.4718, pQ: 0.2522, pS: 0.0954, pF: 0.0672, pC: 0.0329 },
  QAT: { pG: 0.42, pR: 0.1809, pQ: 0.0598, pS: 0.0153, pF: 0.0015, pC: 0.0007 },
  RSA: { pG: 0.4239, pR: 0.2653, pQ: 0.087, pS: 0.022, pF: 0.0016, pC: 0.0002 },
  SCO: { pG: 0.6231, pR: 0.4788, pQ: 0.2011, pS: 0.075, pF: 0.0112, pC: 0.0019 },
  SEN: { pG: 0.6587, pR: 0.275, pQ: 0.0808, pS: 0.0326, pF: 0.0204, pC: 0.0082 },
  SUI: { pG: 0.8505, pR: 0.5244, pQ: 0.3083, pS: 0.1275, pF: 0.0413, pC: 0.0138 },
  SWE: { pG: 0.3544, pR: 0.1648, pQ: 0.0562, pS: 0.017, pF: 0.0038, pC: 0.001 },
  TUN: { pG: 0.283, pR: 0.1306, pQ: 0.0396, pS: 0.0107, pF: 0.0016, pC: 0.0005 },
  TUR: { pG: 0.6022, pR: 0.2564, pQ: 0.111, pS: 0.0565, pF: 0.014, pC: 0.0033 },
  URU: { pG: 0.8165, pR: 0.4398, pQ: 0.1456, pS: 0.0711, pF: 0.0322, pC: 0.0107 },
  USA: { pG: 0.7717, pR: 0.3702, pQ: 0.1892, pS: 0.1087, pF: 0.0375, pC: 0.014 },
  UZB: { pG: 0.1883, pR: 0.0334, pQ: 0.0063, pS: 0.001, pF: 0.0002, pC: 0.0001 },
};
