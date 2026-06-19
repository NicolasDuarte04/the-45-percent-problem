// Auto-generated from M2 batch batch_20260619_024734Z on 2026-06-19T02:47:34Z.
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
  ALG: { pG: 0.4223, pR: 0.1053, pQ: 0.0166, pS: 0.0031, pF: 0.0016, pC: 0.0004 },
  ARG: { pG: 0.9507, pR: 0.6697, pQ: 0.4083, pS: 0.264, pF: 0.2125, pC: 0.1388 },
  AUS: { pG: 0.5574, pR: 0.225, pQ: 0.0924, pS: 0.0412, pF: 0.0086, pC: 0.0025 },
  AUT: { pG: 0.5145, pR: 0.145, pQ: 0.0305, pS: 0.0086, pF: 0.004, pC: 0.0011 },
  BEL: { pG: 0.9752, pR: 0.567, pQ: 0.2877, pS: 0.1677, pF: 0.0813, pC: 0.0327 },
  BIH: { pG: 0.2777, pR: 0.1135, pQ: 0.0286, pS: 0.0055, pF: 0.0004, pC: 0.0 },
  BRA: { pG: 0.9759, pR: 0.7226, pQ: 0.443, pS: 0.3054, pF: 0.1433, pC: 0.0684 },
  CAN: { pG: 0.6797, pR: 0.3418, pQ: 0.1506, pS: 0.0473, pF: 0.0099, pC: 0.0024 },
  CIV: { pG: 0.7695, pR: 0.467, pQ: 0.1918, pS: 0.0773, pF: 0.0128, pC: 0.0021 },
  COD: { pG: 0.2152, pR: 0.0372, pQ: 0.0057, pS: 0.0005, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.7428, pR: 0.3294, pQ: 0.1363, pS: 0.0443, pF: 0.0276, pC: 0.0121 },
  CPV: { pG: 0.132, pR: 0.0536, pQ: 0.0137, pS: 0.0023, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7591, pR: 0.4061, pQ: 0.1706, pS: 0.0574, pF: 0.0355, pC: 0.0152 },
  CUW: { pG: 0.1839, pR: 0.1286, pQ: 0.0246, pS: 0.0037, pF: 0.0004, pC: 0.0 },
  CZE: { pG: 0.6243, pR: 0.4062, pQ: 0.1633, pS: 0.0536, pF: 0.008, pC: 0.0017 },
  ECU: { pG: 0.8669, pR: 0.4897, pQ: 0.2229, pS: 0.0928, pF: 0.023, pC: 0.0064 },
  EGY: { pG: 0.8317, pR: 0.4768, pQ: 0.2119, pS: 0.1017, pF: 0.0186, pC: 0.0049 },
  ENG: { pG: 0.9069, pR: 0.6285, pQ: 0.4144, pS: 0.1968, pF: 0.1502, pC: 0.0888 },
  ESP: { pG: 0.9767, pR: 0.7807, pQ: 0.5891, pS: 0.4304, pF: 0.317, pC: 0.1927 },
  FRA: { pG: 0.9321, pR: 0.7017, pQ: 0.443, pS: 0.2851, pF: 0.232, pC: 0.1505 },
  GER: { pG: 0.9679, pR: 0.6244, pQ: 0.3858, pS: 0.1824, pF: 0.0902, pC: 0.036 },
  GHA: { pG: 0.0508, pR: 0.006, pQ: 0.0009, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1273, pR: 0.0988, pQ: 0.0221, pS: 0.0035, pF: 0.0003, pC: 0.0 },
  IRN: { pG: 0.8931, pR: 0.4741, pQ: 0.2199, pS: 0.1106, pF: 0.0291, pC: 0.0087 },
  IRQ: { pG: 0.1214, pR: 0.0193, pQ: 0.0022, pS: 0.0006, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1125, pR: 0.0094, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7041, pR: 0.3951, pQ: 0.1812, pS: 0.0637, pF: 0.0258, pC: 0.0093 },
  KOR: { pG: 0.8072, pR: 0.5239, pQ: 0.2507, pS: 0.1012, pF: 0.0232, pC: 0.0062 },
  KSA: { pG: 0.2073, pR: 0.0938, pQ: 0.0261, pS: 0.0082, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9749, pR: 0.7047, pQ: 0.4229, pS: 0.2863, pF: 0.1322, pC: 0.0599 },
  MEX: { pG: 0.9228, pR: 0.6516, pQ: 0.4201, pS: 0.209, pF: 0.0753, pC: 0.0273 },
  NED: { pG: 0.8722, pR: 0.6006, pQ: 0.3823, pS: 0.1748, pF: 0.099, pC: 0.0444 },
  NOR: { pG: 0.2826, pR: 0.0744, pQ: 0.0149, pS: 0.0032, pF: 0.001, pC: 0.0002 },
  NZL: { pG: 0.152, pR: 0.1098, pQ: 0.0201, pS: 0.0032, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2832, pR: 0.0887, pQ: 0.0203, pS: 0.0026, pF: 0.0013, pC: 0.0004 },
  PAR: { pG: 0.3648, pR: 0.1402, pQ: 0.0537, pS: 0.0207, pF: 0.0021, pC: 0.0004 },
  POR: { pG: 0.8534, pR: 0.4705, pQ: 0.2457, pS: 0.1005, pF: 0.0677, pC: 0.0328 },
  QAT: { pG: 0.4236, pR: 0.1839, pQ: 0.0608, pS: 0.0156, pF: 0.002, pC: 0.0005 },
  RSA: { pG: 0.4234, pR: 0.2705, pQ: 0.09, pS: 0.0232, pF: 0.0022, pC: 0.0003 },
  SCO: { pG: 0.6296, pR: 0.4851, pQ: 0.2081, pS: 0.0803, pF: 0.012, pC: 0.0016 },
  SEN: { pG: 0.6639, pR: 0.2752, pQ: 0.0839, pS: 0.0324, pF: 0.02, pC: 0.0085 },
  SUI: { pG: 0.8413, pR: 0.5086, pQ: 0.2983, pS: 0.1237, pF: 0.0399, pC: 0.0127 },
  SWE: { pG: 0.3587, pR: 0.1702, pQ: 0.0576, pS: 0.019, pF: 0.0038, pC: 0.0008 },
  TUN: { pG: 0.2768, pR: 0.1244, pQ: 0.0374, pS: 0.0105, pF: 0.0015, pC: 0.0005 },
  TUR: { pG: 0.6043, pR: 0.255, pQ: 0.1125, pS: 0.0537, pF: 0.0137, pC: 0.0048 },
  URU: { pG: 0.832, pR: 0.4442, pQ: 0.1479, pS: 0.0744, pF: 0.0314, pC: 0.0112 },
  USA: { pG: 0.7658, pR: 0.3686, pQ: 0.1829, pS: 0.1071, pF: 0.0384, pC: 0.0127 },
  UZB: { pG: 0.1886, pR: 0.0336, pQ: 0.0061, pS: 0.0008, pF: 0.0004, pC: 0.0 },
};
