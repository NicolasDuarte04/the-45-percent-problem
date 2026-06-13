// Auto-generated from M2 batch batch_20260613_211217Z on 2026-06-13T21:12:17Z.
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
  ALG: { pG: 0.4197, pR: 0.0959, pQ: 0.0191, pS: 0.0044, pF: 0.0022, pC: 0.0006 },
  ARG: { pG: 0.9524, pR: 0.677, pQ: 0.4156, pS: 0.2724, pF: 0.2231, pC: 0.1468 },
  AUS: { pG: 0.562, pR: 0.2341, pQ: 0.0962, pS: 0.0444, pF: 0.0111, pC: 0.0026 },
  AUT: { pG: 0.5107, pR: 0.1382, pQ: 0.0269, pS: 0.0074, pF: 0.0035, pC: 0.001 },
  BEL: { pG: 0.9733, pR: 0.5628, pQ: 0.285, pS: 0.1689, pF: 0.0806, pC: 0.0345 },
  BIH: { pG: 0.2693, pR: 0.1102, pQ: 0.0302, pS: 0.0061, pF: 0.0005, pC: 0.0001 },
  BRA: { pG: 0.9768, pR: 0.7159, pQ: 0.4406, pS: 0.2978, pF: 0.1401, pC: 0.0646 },
  CAN: { pG: 0.6797, pR: 0.3405, pQ: 0.1465, pS: 0.0515, pF: 0.0118, pC: 0.0023 },
  CIV: { pG: 0.7698, pR: 0.4701, pQ: 0.1954, pS: 0.0779, pF: 0.0123, pC: 0.0024 },
  COD: { pG: 0.2057, pR: 0.038, pQ: 0.0057, pS: 0.001, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7467, pR: 0.3288, pQ: 0.1323, pS: 0.0404, pF: 0.0243, pC: 0.0091 },
  CPV: { pG: 0.1341, pR: 0.0583, pQ: 0.0132, pS: 0.0041, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7575, pR: 0.4049, pQ: 0.1706, pS: 0.0554, pF: 0.0357, pC: 0.0144 },
  CUW: { pG: 0.1799, pR: 0.1241, pQ: 0.0244, pS: 0.0036, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6208, pR: 0.4005, pQ: 0.1525, pS: 0.05, pF: 0.0067, pC: 0.0012 },
  ECU: { pG: 0.8699, pR: 0.495, pQ: 0.2259, pS: 0.0956, pF: 0.0247, pC: 0.006 },
  EGY: { pG: 0.8293, pR: 0.4811, pQ: 0.2111, pS: 0.0977, pF: 0.0194, pC: 0.005 },
  ENG: { pG: 0.9106, pR: 0.6275, pQ: 0.4136, pS: 0.1985, pF: 0.1514, pC: 0.0893 },
  ESP: { pG: 0.9776, pR: 0.7769, pQ: 0.5902, pS: 0.423, pF: 0.311, pC: 0.1874 },
  FRA: { pG: 0.9321, pR: 0.709, pQ: 0.4428, pS: 0.2831, pF: 0.2278, pC: 0.1473 },
  GER: { pG: 0.9709, pR: 0.6136, pQ: 0.3801, pS: 0.181, pF: 0.0889, pC: 0.0375 },
  GHA: { pG: 0.05, pR: 0.0056, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1323, pR: 0.1042, pQ: 0.0243, pS: 0.0045, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8928, pR: 0.4742, pQ: 0.2158, pS: 0.1141, pF: 0.0331, pC: 0.0101 },
  IRQ: { pG: 0.1224, pR: 0.0191, pQ: 0.0011, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1172, pR: 0.0136, pQ: 0.0011, pS: 0.0003, pF: 0.0002, pC: 0.0 },
  JPN: { pG: 0.7189, pR: 0.4137, pQ: 0.19, pS: 0.0697, pF: 0.0284, pC: 0.0089 },
  KOR: { pG: 0.8096, pR: 0.528, pQ: 0.2587, pS: 0.1035, pF: 0.0237, pC: 0.0061 },
  KSA: { pG: 0.2144, pR: 0.0968, pQ: 0.0232, pS: 0.0082, pF: 0.0011, pC: 0.0001 },
  MAR: { pG: 0.9721, pR: 0.7064, pQ: 0.4279, pS: 0.2898, pF: 0.1309, pC: 0.0626 },
  MEX: { pG: 0.9134, pR: 0.6448, pQ: 0.4128, pS: 0.2004, pF: 0.0692, pC: 0.023 },
  NED: { pG: 0.8703, pR: 0.5952, pQ: 0.3806, pS: 0.1776, pF: 0.0997, pC: 0.0455 },
  NOR: { pG: 0.2891, pR: 0.0697, pQ: 0.0126, pS: 0.0031, pF: 0.0013, pC: 0.0003 },
  NZL: { pG: 0.1522, pR: 0.1074, pQ: 0.0224, pS: 0.005, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2819, pR: 0.0867, pQ: 0.0187, pS: 0.0026, pF: 0.001, pC: 0.0003 },
  PAR: { pG: 0.3695, pR: 0.1417, pQ: 0.0543, pS: 0.0204, pF: 0.0031, pC: 0.0007 },
  POR: { pG: 0.858, pR: 0.4722, pQ: 0.2529, pS: 0.0993, pF: 0.0689, pC: 0.0362 },
  QAT: { pG: 0.4302, pR: 0.1885, pQ: 0.0593, pS: 0.0136, pF: 0.0009, pC: 0.0003 },
  RSA: { pG: 0.4287, pR: 0.28, pQ: 0.09, pS: 0.0263, pF: 0.0023, pC: 0.0002 },
  SCO: { pG: 0.6296, pR: 0.481, pQ: 0.2052, pS: 0.0775, pF: 0.0108, pC: 0.0018 },
  SEN: { pG: 0.6564, pR: 0.2775, pQ: 0.0808, pS: 0.0315, pF: 0.0187, pC: 0.0086 },
  SUI: { pG: 0.8483, pR: 0.5075, pQ: 0.3029, pS: 0.1281, pF: 0.0433, pC: 0.0156 },
  SWE: { pG: 0.3386, pR: 0.1613, pQ: 0.0561, pS: 0.0174, pF: 0.0037, pC: 0.0008 },
  TUN: { pG: 0.2817, pR: 0.127, pQ: 0.0408, pS: 0.0109, pF: 0.0021, pC: 0.0006 },
  TUR: { pG: 0.5986, pR: 0.2545, pQ: 0.1106, pS: 0.0528, pF: 0.0124, pC: 0.0033 },
  URU: { pG: 0.8263, pR: 0.4425, pQ: 0.1458, pS: 0.0698, pF: 0.0314, pC: 0.0107 },
  USA: { pG: 0.7591, pR: 0.3622, pQ: 0.188, pS: 0.1088, pF: 0.038, pC: 0.0122 },
  UZB: { pG: 0.1896, pR: 0.0363, pQ: 0.0059, pS: 0.0005, pF: 0.0001, pC: 0.0 },
};
