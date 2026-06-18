// Auto-generated from M2 batch batch_20260618_084225Z on 2026-06-18T08:42:25Z.
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
  ALG: { pG: 0.4223, pR: 0.0975, pQ: 0.0145, pS: 0.0033, pF: 0.0011, pC: 0.0003 },
  ARG: { pG: 0.953, pR: 0.677, pQ: 0.4172, pS: 0.2658, pF: 0.2147, pC: 0.1388 },
  AUS: { pG: 0.5608, pR: 0.23, pQ: 0.0998, pS: 0.0461, pF: 0.0097, pC: 0.0031 },
  AUT: { pG: 0.5123, pR: 0.1396, pQ: 0.0283, pS: 0.0092, pF: 0.0039, pC: 0.0013 },
  BEL: { pG: 0.9721, pR: 0.5653, pQ: 0.2792, pS: 0.1644, pF: 0.0802, pC: 0.0335 },
  BIH: { pG: 0.2664, pR: 0.1082, pQ: 0.0305, pS: 0.0061, pF: 0.0007, pC: 0.0001 },
  BRA: { pG: 0.9724, pR: 0.717, pQ: 0.4464, pS: 0.305, pF: 0.1454, pC: 0.0674 },
  CAN: { pG: 0.6886, pR: 0.349, pQ: 0.1524, pS: 0.0534, pF: 0.0132, pC: 0.0033 },
  CIV: { pG: 0.7789, pR: 0.4755, pQ: 0.1967, pS: 0.076, pF: 0.0127, pC: 0.0026 },
  COD: { pG: 0.2031, pR: 0.0371, pQ: 0.0059, pS: 0.0007, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7514, pR: 0.3337, pQ: 0.1368, pS: 0.0426, pF: 0.0253, pC: 0.0105 },
  CPV: { pG: 0.1354, pR: 0.0557, pQ: 0.0119, pS: 0.0027, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7689, pR: 0.4121, pQ: 0.176, pS: 0.0603, pF: 0.0391, pC: 0.0155 },
  CUW: { pG: 0.1785, pR: 0.1199, pQ: 0.025, pS: 0.0045, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6218, pR: 0.4004, pQ: 0.1609, pS: 0.0558, pF: 0.0085, pC: 0.0013 },
  ECU: { pG: 0.8598, pR: 0.4944, pQ: 0.2249, pS: 0.0968, pF: 0.0249, pC: 0.0069 },
  EGY: { pG: 0.8287, pR: 0.4848, pQ: 0.2152, pS: 0.0986, pF: 0.0171, pC: 0.004 },
  ENG: { pG: 0.9015, pR: 0.6163, pQ: 0.3976, pS: 0.1923, pF: 0.145, pC: 0.0817 },
  ESP: { pG: 0.9761, pR: 0.7736, pQ: 0.5931, pS: 0.4328, pF: 0.3186, pC: 0.1968 },
  FRA: { pG: 0.9328, pR: 0.7101, pQ: 0.4413, pS: 0.2861, pF: 0.2333, pC: 0.1488 },
  GER: { pG: 0.9715, pR: 0.628, pQ: 0.3902, pS: 0.1816, pF: 0.0881, pC: 0.0383 },
  GHA: { pG: 0.0487, pR: 0.0067, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.131, pR: 0.1011, pQ: 0.0218, pS: 0.0034, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8981, pR: 0.4798, pQ: 0.21, pS: 0.1056, pF: 0.0285, pC: 0.0085 },
  IRQ: { pG: 0.1195, pR: 0.0185, pQ: 0.0017, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1124, pR: 0.0125, pQ: 0.0007, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7173, pR: 0.4062, pQ: 0.1871, pS: 0.0721, pF: 0.0313, pC: 0.0102 },
  KOR: { pG: 0.8045, pR: 0.5176, pQ: 0.2481, pS: 0.0988, pF: 0.0244, pC: 0.0061 },
  KSA: { pG: 0.2212, pR: 0.0946, pQ: 0.0264, pS: 0.0071, pF: 0.0008, pC: 0.0 },
  MAR: { pG: 0.9693, pR: 0.7069, pQ: 0.4193, pS: 0.285, pF: 0.1295, pC: 0.0596 },
  MEX: { pG: 0.9195, pR: 0.6564, pQ: 0.4216, pS: 0.2042, pF: 0.0667, pC: 0.0245 },
  NED: { pG: 0.8694, pR: 0.591, pQ: 0.3798, pS: 0.1736, pF: 0.0964, pC: 0.044 },
  NOR: { pG: 0.2739, pR: 0.0679, pQ: 0.0122, pS: 0.0032, pF: 0.0017, pC: 0.0003 },
  NZL: { pG: 0.149, pR: 0.105, pQ: 0.0175, pS: 0.0032, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2809, pR: 0.0868, pQ: 0.0186, pS: 0.0031, pF: 0.0009, pC: 0.0001 },
  PAR: { pG: 0.3693, pR: 0.1413, pQ: 0.0506, pS: 0.019, pF: 0.0027, pC: 0.0003 },
  POR: { pG: 0.8603, pR: 0.4755, pQ: 0.2608, pS: 0.1016, pF: 0.071, pC: 0.0345 },
  QAT: { pG: 0.4284, pR: 0.1781, pQ: 0.058, pS: 0.0147, pF: 0.0014, pC: 0.0 },
  RSA: { pG: 0.4322, pR: 0.2852, pQ: 0.0901, pS: 0.0237, pF: 0.0025, pC: 0.0008 },
  SCO: { pG: 0.6297, pR: 0.4804, pQ: 0.2012, pS: 0.0767, pF: 0.0111, pC: 0.002 },
  SEN: { pG: 0.6738, pR: 0.2769, pQ: 0.0841, pS: 0.0311, pF: 0.018, pC: 0.0077 },
  SUI: { pG: 0.8386, pR: 0.5051, pQ: 0.298, pS: 0.1237, pF: 0.0403, pC: 0.0143 },
  SWE: { pG: 0.3454, pR: 0.1604, pQ: 0.0557, pS: 0.0185, pF: 0.0044, pC: 0.001 },
  TUN: { pG: 0.2792, pR: 0.1246, pQ: 0.041, pS: 0.0114, pF: 0.0016, pC: 0.0002 },
  TUR: { pG: 0.6024, pR: 0.2583, pQ: 0.1178, pS: 0.0571, pF: 0.0151, pC: 0.0055 },
  URU: { pG: 0.8194, pR: 0.4412, pQ: 0.1463, pS: 0.0702, pF: 0.0297, pC: 0.0105 },
  USA: { pG: 0.7651, pR: 0.365, pQ: 0.1835, pS: 0.1082, pF: 0.0397, pC: 0.0157 },
  UZB: { pG: 0.1852, pR: 0.0318, pQ: 0.004, pS: 0.0002, pF: 0.0, pC: 0.0 },
};
