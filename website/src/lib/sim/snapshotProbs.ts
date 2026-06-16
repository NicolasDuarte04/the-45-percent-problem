// Auto-generated from M2 batch batch_20260616_002908Z on 2026-06-16T00:29:08Z.
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
  ALG: { pG: 0.4251, pR: 0.0986, pQ: 0.0177, pS: 0.0034, pF: 0.0016, pC: 0.0007 },
  ARG: { pG: 0.9532, pR: 0.6798, pQ: 0.421, pS: 0.2701, pF: 0.2176, pC: 0.1398 },
  AUS: { pG: 0.5584, pR: 0.2345, pQ: 0.0947, pS: 0.0438, pF: 0.01, pC: 0.002 },
  AUT: { pG: 0.5116, pR: 0.1411, pQ: 0.0267, pS: 0.0071, pF: 0.0036, pC: 0.0011 },
  BEL: { pG: 0.9735, pR: 0.5583, pQ: 0.2857, pS: 0.1672, pF: 0.0824, pC: 0.036 },
  BIH: { pG: 0.2667, pR: 0.106, pQ: 0.0262, pS: 0.0053, pF: 0.0001, pC: 0.0 },
  BRA: { pG: 0.9711, pR: 0.7093, pQ: 0.4463, pS: 0.3095, pF: 0.1457, pC: 0.0672 },
  CAN: { pG: 0.6834, pR: 0.3408, pQ: 0.1505, pS: 0.05, pF: 0.0113, pC: 0.003 },
  CIV: { pG: 0.7696, pR: 0.4754, pQ: 0.1954, pS: 0.0752, pF: 0.0125, pC: 0.002 },
  COD: { pG: 0.2078, pR: 0.0375, pQ: 0.0069, pS: 0.0006, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7492, pR: 0.3388, pQ: 0.141, pS: 0.042, pF: 0.0254, pC: 0.0096 },
  CPV: { pG: 0.1335, pR: 0.0577, pQ: 0.013, pS: 0.0036, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7596, pR: 0.4106, pQ: 0.1745, pS: 0.0596, pF: 0.0378, pC: 0.0176 },
  CUW: { pG: 0.1796, pR: 0.124, pQ: 0.0236, pS: 0.0043, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6185, pR: 0.4081, pQ: 0.1617, pS: 0.0546, pF: 0.0076, pC: 0.0017 },
  ECU: { pG: 0.8646, pR: 0.4921, pQ: 0.2228, pS: 0.0972, pF: 0.0237, pC: 0.0072 },
  EGY: { pG: 0.8284, pR: 0.4855, pQ: 0.2088, pS: 0.0982, pF: 0.021, pC: 0.005 },
  ENG: { pG: 0.9108, pR: 0.6275, pQ: 0.4131, pS: 0.1944, pF: 0.147, pC: 0.0849 },
  ESP: { pG: 0.9779, pR: 0.7784, pQ: 0.5883, pS: 0.427, pF: 0.3127, pC: 0.1909 },
  FRA: { pG: 0.9344, pR: 0.7055, pQ: 0.4408, pS: 0.2888, pF: 0.2327, pC: 0.1505 },
  GER: { pG: 0.9727, pR: 0.6152, pQ: 0.3834, pS: 0.1783, pF: 0.0873, pC: 0.0351 },
  GHA: { pG: 0.0495, pR: 0.0053, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.133, pR: 0.1049, pQ: 0.0239, pS: 0.0044, pF: 0.0003, pC: 0.0001 },
  IRN: { pG: 0.8992, pR: 0.4771, pQ: 0.2194, pS: 0.1108, pF: 0.0289, pC: 0.0093 },
  IRQ: { pG: 0.1188, pR: 0.0177, pQ: 0.002, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1101, pR: 0.0092, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7165, pR: 0.4061, pQ: 0.1905, pS: 0.0741, pF: 0.0317, pC: 0.0123 },
  KOR: { pG: 0.8028, pR: 0.5226, pQ: 0.2499, pS: 0.0983, pF: 0.0235, pC: 0.0061 },
  KSA: { pG: 0.2102, pR: 0.0959, pQ: 0.0262, pS: 0.0081, pF: 0.0008, pC: 0.0002 },
  MAR: { pG: 0.9712, pR: 0.7048, pQ: 0.4226, pS: 0.2843, pF: 0.1281, pC: 0.061 },
  MEX: { pG: 0.9212, pR: 0.6508, pQ: 0.4146, pS: 0.1977, pF: 0.0701, pC: 0.0258 },
  NED: { pG: 0.8685, pR: 0.5954, pQ: 0.3815, pS: 0.1791, pF: 0.1035, pC: 0.047 },
  NOR: { pG: 0.2729, pR: 0.0663, pQ: 0.0115, pS: 0.0035, pF: 0.0017, pC: 0.0006 },
  NZL: { pG: 0.146, pR: 0.1093, pQ: 0.0181, pS: 0.0029, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2801, pR: 0.0848, pQ: 0.0184, pS: 0.0027, pF: 0.001, pC: 0.0005 },
  PAR: { pG: 0.3702, pR: 0.1436, pQ: 0.0544, pS: 0.0212, pF: 0.0042, pC: 0.0006 },
  POR: { pG: 0.8571, pR: 0.4622, pQ: 0.2381, pS: 0.0949, pF: 0.0671, pC: 0.0342 },
  QAT: { pG: 0.4247, pR: 0.1799, pQ: 0.0574, pS: 0.0129, pF: 0.0014, pC: 0.0002 },
  RSA: { pG: 0.435, pR: 0.2768, pQ: 0.094, pS: 0.0244, pF: 0.0019, pC: 0.0004 },
  SCO: { pG: 0.6309, pR: 0.4857, pQ: 0.2101, pS: 0.0797, pF: 0.0111, pC: 0.0025 },
  SEN: { pG: 0.6739, pR: 0.2818, pQ: 0.08, pS: 0.0319, pF: 0.0193, pC: 0.007 },
  SUI: { pG: 0.8477, pR: 0.515, pQ: 0.306, pS: 0.1335, pF: 0.0417, pC: 0.0123 },
  SWE: { pG: 0.3525, pR: 0.1647, pQ: 0.0607, pS: 0.0189, pF: 0.0024, pC: 0.0007 },
  TUN: { pG: 0.276, pR: 0.1271, pQ: 0.039, pS: 0.012, pF: 0.0019, pC: 0.0001 },
  TUR: { pG: 0.6046, pR: 0.2526, pQ: 0.1065, pS: 0.0538, pF: 0.0151, pC: 0.0044 },
  URU: { pG: 0.8313, pR: 0.4378, pQ: 0.1436, pS: 0.0703, pF: 0.0302, pC: 0.0106 },
  USA: { pG: 0.7606, pR: 0.3646, pQ: 0.1812, pS: 0.0994, pF: 0.0331, pC: 0.0096 },
  UZB: { pG: 0.1859, pR: 0.0333, pQ: 0.0072, pS: 0.0008, pF: 0.0004, pC: 0.0002 },
};
