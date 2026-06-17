// Auto-generated from M2 batch batch_20260617_023348Z on 2026-06-17T02:33:48Z.
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
  ALG: { pG: 0.4283, pR: 0.1084, pQ: 0.0211, pS: 0.0047, pF: 0.0021, pC: 0.0003 },
  ARG: { pG: 0.9537, pR: 0.675, pQ: 0.4238, pS: 0.2735, pF: 0.2172, pC: 0.1388 },
  AUS: { pG: 0.5555, pR: 0.2313, pQ: 0.0947, pS: 0.0453, pF: 0.0093, pC: 0.0022 },
  AUT: { pG: 0.5131, pR: 0.1431, pQ: 0.0283, pS: 0.0082, pF: 0.0047, pC: 0.0008 },
  BEL: { pG: 0.9752, pR: 0.5645, pQ: 0.282, pS: 0.1667, pF: 0.082, pC: 0.0365 },
  BIH: { pG: 0.2695, pR: 0.1089, pQ: 0.0269, pS: 0.0053, pF: 0.0, pC: 0.0 },
  BRA: { pG: 0.9721, pR: 0.7098, pQ: 0.4382, pS: 0.2968, pF: 0.1377, pC: 0.0654 },
  CAN: { pG: 0.6759, pR: 0.337, pQ: 0.1423, pS: 0.0473, pF: 0.0099, pC: 0.0019 },
  CIV: { pG: 0.7697, pR: 0.4733, pQ: 0.1985, pS: 0.0769, pF: 0.013, pC: 0.0019 },
  COD: { pG: 0.1983, pR: 0.0376, pQ: 0.0072, pS: 0.0005, pF: 0.0001, pC: 0.0001 },
  COL: { pG: 0.7573, pR: 0.3325, pQ: 0.1341, pS: 0.0416, pF: 0.0251, pC: 0.0111 },
  CPV: { pG: 0.1293, pR: 0.0587, pQ: 0.0133, pS: 0.0028, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7658, pR: 0.4026, pQ: 0.1688, pS: 0.059, pF: 0.038, pC: 0.016 },
  CUW: { pG: 0.1759, pR: 0.1167, pQ: 0.0229, pS: 0.0042, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6191, pR: 0.4054, pQ: 0.1614, pS: 0.0572, pF: 0.008, pC: 0.0016 },
  ECU: { pG: 0.8671, pR: 0.4904, pQ: 0.2166, pS: 0.0884, pF: 0.0233, pC: 0.007 },
  EGY: { pG: 0.8235, pR: 0.4714, pQ: 0.2085, pS: 0.1047, pF: 0.0234, pC: 0.0059 },
  ENG: { pG: 0.9057, pR: 0.6295, pQ: 0.4102, pS: 0.1944, pF: 0.1452, pC: 0.0859 },
  ESP: { pG: 0.9799, pR: 0.7815, pQ: 0.5971, pS: 0.4342, pF: 0.3198, pC: 0.1955 },
  FRA: { pG: 0.9313, pR: 0.6973, pQ: 0.428, pS: 0.2733, pF: 0.2218, pC: 0.1436 },
  GER: { pG: 0.97, pR: 0.6217, pQ: 0.3796, pS: 0.1748, pF: 0.0871, pC: 0.0378 },
  GHA: { pG: 0.0488, pR: 0.0062, pQ: 0.0004, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1293, pR: 0.0996, pQ: 0.0207, pS: 0.0036, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8944, pR: 0.4691, pQ: 0.2171, pS: 0.1069, pF: 0.0268, pC: 0.0071 },
  IRQ: { pG: 0.1197, pR: 0.0164, pQ: 0.0014, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1049, pR: 0.0101, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7063, pR: 0.4003, pQ: 0.1895, pS: 0.0682, pF: 0.0269, pC: 0.0088 },
  KOR: { pG: 0.808, pR: 0.5202, pQ: 0.2512, pS: 0.0997, pF: 0.0251, pC: 0.0067 },
  KSA: { pG: 0.2112, pR: 0.0952, pQ: 0.0276, pS: 0.0095, pF: 0.0008, pC: 0.0001 },
  MAR: { pG: 0.9711, pR: 0.7038, pQ: 0.4277, pS: 0.2873, pF: 0.1313, pC: 0.0598 },
  MEX: { pG: 0.92, pR: 0.6523, pQ: 0.4238, pS: 0.205, pF: 0.0707, pC: 0.0247 },
  NED: { pG: 0.8681, pR: 0.5998, pQ: 0.3841, pS: 0.1797, pF: 0.105, pC: 0.0512 },
  NOR: { pG: 0.2795, pR: 0.0711, pQ: 0.013, pS: 0.0036, pF: 0.0019, pC: 0.0005 },
  NZL: { pG: 0.1542, pR: 0.1067, pQ: 0.0201, pS: 0.0031, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2797, pR: 0.0816, pQ: 0.0177, pS: 0.0032, pF: 0.0017, pC: 0.0003 },
  PAR: { pG: 0.3742, pR: 0.1486, pQ: 0.0511, pS: 0.0186, pF: 0.003, pC: 0.0009 },
  POR: { pG: 0.8563, pR: 0.4759, pQ: 0.2569, pS: 0.1035, pF: 0.0706, pC: 0.0336 },
  QAT: { pG: 0.431, pR: 0.1881, pQ: 0.0601, pS: 0.0147, pF: 0.0011, pC: 0.0003 },
  RSA: { pG: 0.4296, pR: 0.275, pQ: 0.0918, pS: 0.0255, pF: 0.0024, pC: 0.0007 },
  SCO: { pG: 0.64, pR: 0.4889, pQ: 0.2125, pS: 0.0831, pF: 0.0116, pC: 0.0017 },
  SEN: { pG: 0.6695, pR: 0.2786, pQ: 0.0838, pS: 0.0334, pF: 0.0207, pC: 0.0067 },
  SUI: { pG: 0.8469, pR: 0.5131, pQ: 0.3041, pS: 0.1324, pF: 0.0459, pC: 0.0146 },
  SWE: { pG: 0.3513, pR: 0.1637, pQ: 0.055, pS: 0.0153, pF: 0.0029, pC: 0.0006 },
  TUN: { pG: 0.2916, pR: 0.1341, pQ: 0.0433, pS: 0.0121, pF: 0.0016, pC: 0.0003 },
  TUR: { pG: 0.5989, pR: 0.2535, pQ: 0.1112, pS: 0.0534, pF: 0.0145, pC: 0.0045 },
  URU: { pG: 0.8323, pR: 0.4529, pQ: 0.1448, pS: 0.0695, pF: 0.0297, pC: 0.0111 },
  USA: { pG: 0.7589, pR: 0.3645, pQ: 0.1823, pS: 0.1078, pF: 0.0376, pC: 0.0135 },
  UZB: { pG: 0.1881, pR: 0.0341, pQ: 0.0047, pS: 0.0009, pF: 0.0001, pC: 0.0 },
};
