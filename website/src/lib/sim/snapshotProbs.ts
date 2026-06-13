// Auto-generated from M2 batch batch_20260613_135214Z on 2026-06-13T13:52:14Z.
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
  ALG: { pG: 0.4257, pR: 0.0971, pQ: 0.0166, pS: 0.0046, pF: 0.0025, pC: 0.0008 },
  ARG: { pG: 0.9518, pR: 0.6795, pQ: 0.4238, pS: 0.2774, pF: 0.2249, pC: 0.1448 },
  AUS: { pG: 0.5593, pR: 0.2283, pQ: 0.0963, pS: 0.0474, pF: 0.0112, pC: 0.0031 },
  AUT: { pG: 0.5082, pR: 0.1361, pQ: 0.0267, pS: 0.0075, pF: 0.0042, pC: 0.0007 },
  BEL: { pG: 0.9723, pR: 0.5678, pQ: 0.2854, pS: 0.1705, pF: 0.0812, pC: 0.0364 },
  BIH: { pG: 0.2685, pR: 0.1121, pQ: 0.0302, pS: 0.0051, pF: 0.0007, pC: 0.0001 },
  BRA: { pG: 0.972, pR: 0.7093, pQ: 0.4317, pS: 0.2885, pF: 0.1302, pC: 0.0606 },
  CAN: { pG: 0.6758, pR: 0.3298, pQ: 0.1396, pS: 0.0445, pF: 0.0094, pC: 0.0023 },
  CIV: { pG: 0.7693, pR: 0.4623, pQ: 0.1884, pS: 0.0745, pF: 0.0135, pC: 0.0022 },
  COD: { pG: 0.205, pR: 0.0367, pQ: 0.0057, pS: 0.0004, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7479, pR: 0.3274, pQ: 0.131, pS: 0.0394, pF: 0.0242, pC: 0.009 },
  CPV: { pG: 0.1309, pR: 0.0576, pQ: 0.0139, pS: 0.0032, pF: 0.0004, pC: 0.0001 },
  CRO: { pG: 0.7674, pR: 0.4194, pQ: 0.176, pS: 0.0565, pF: 0.037, pC: 0.0153 },
  CUW: { pG: 0.1773, pR: 0.1186, pQ: 0.0252, pS: 0.0038, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.613, pR: 0.3961, pQ: 0.1621, pS: 0.055, pF: 0.0084, pC: 0.0021 },
  ECU: { pG: 0.8652, pR: 0.5048, pQ: 0.2329, pS: 0.0946, pF: 0.0245, pC: 0.0068 },
  EGY: { pG: 0.8256, pR: 0.4751, pQ: 0.2099, pS: 0.1031, pF: 0.0194, pC: 0.0057 },
  ENG: { pG: 0.9016, pR: 0.6302, pQ: 0.4137, pS: 0.1975, pF: 0.148, pC: 0.0871 },
  ESP: { pG: 0.9787, pR: 0.7816, pQ: 0.598, pS: 0.433, pF: 0.3149, pC: 0.192 },
  FRA: { pG: 0.9356, pR: 0.7073, pQ: 0.4361, pS: 0.2818, pF: 0.2298, pC: 0.1487 },
  GER: { pG: 0.9743, pR: 0.6329, pQ: 0.3848, pS: 0.1764, pF: 0.0894, pC: 0.0389 },
  GHA: { pG: 0.0488, pR: 0.0057, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1281, pR: 0.0989, pQ: 0.0198, pS: 0.0035, pF: 0.0, pC: 0.0 },
  IRN: { pG: 0.8995, pR: 0.4792, pQ: 0.2136, pS: 0.109, pF: 0.0295, pC: 0.0091 },
  IRQ: { pG: 0.1178, pR: 0.0178, pQ: 0.002, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1143, pR: 0.0099, pQ: 0.0008, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7124, pR: 0.4077, pQ: 0.1961, pS: 0.0753, pF: 0.0295, pC: 0.0089 },
  KOR: { pG: 0.8117, pR: 0.5308, pQ: 0.2627, pS: 0.1084, pF: 0.0227, pC: 0.006 },
  KSA: { pG: 0.2178, pR: 0.0945, pQ: 0.0239, pS: 0.0065, pF: 0.0005, pC: 0.0 },
  MAR: { pG: 0.9746, pR: 0.7073, pQ: 0.4255, pS: 0.2921, pF: 0.1347, pC: 0.0631 },
  MEX: { pG: 0.9185, pR: 0.6504, pQ: 0.4188, pS: 0.2093, pF: 0.0773, pC: 0.0277 },
  NED: { pG: 0.8717, pR: 0.5916, pQ: 0.3729, pS: 0.173, pF: 0.098, pC: 0.0444 },
  NOR: { pG: 0.2814, pR: 0.0726, pQ: 0.0134, pS: 0.0028, pF: 0.0017, pC: 0.0005 },
  NZL: { pG: 0.1555, pR: 0.1107, pQ: 0.0218, pS: 0.0041, pF: 0.0001, pC: 0.0001 },
  PAN: { pG: 0.2822, pR: 0.0854, pQ: 0.0204, pS: 0.0033, pF: 0.0018, pC: 0.0004 },
  PAR: { pG: 0.3693, pR: 0.1437, pQ: 0.0513, pS: 0.0191, pF: 0.0022, pC: 0.0007 },
  POR: { pG: 0.8602, pR: 0.4607, pQ: 0.2467, pS: 0.0958, pF: 0.0652, pC: 0.0323 },
  QAT: { pG: 0.4308, pR: 0.1853, pQ: 0.0591, pS: 0.0137, pF: 0.0016, pC: 0.0004 },
  RSA: { pG: 0.4356, pR: 0.282, pQ: 0.0881, pS: 0.0236, pF: 0.0022, pC: 0.0002 },
  SCO: { pG: 0.6366, pR: 0.4886, pQ: 0.2132, pS: 0.0766, pF: 0.0123, pC: 0.0025 },
  SEN: { pG: 0.6652, pR: 0.2797, pQ: 0.0806, pS: 0.0317, pF: 0.0197, pC: 0.0092 },
  SUI: { pG: 0.8461, pR: 0.5135, pQ: 0.3006, pS: 0.1283, pF: 0.0427, pC: 0.0126 },
  SWE: { pG: 0.3448, pR: 0.1552, pQ: 0.0511, pS: 0.015, pF: 0.0029, pC: 0.0006 },
  TUN: { pG: 0.285, pR: 0.1269, pQ: 0.0382, pS: 0.0107, pF: 0.0014, pC: 0.0002 },
  TUR: { pG: 0.6001, pR: 0.2522, pQ: 0.1116, pS: 0.053, pF: 0.0139, pC: 0.0035 },
  URU: { pG: 0.8197, pR: 0.4335, pQ: 0.1439, pS: 0.0716, pF: 0.0308, pC: 0.0108 },
  USA: { pG: 0.76, pR: 0.3717, pQ: 0.1894, pS: 0.1076, pF: 0.0348, pC: 0.0101 },
  UZB: { pG: 0.1869, pR: 0.0345, pQ: 0.0057, pS: 0.0008, pF: 0.0003, pC: 0.0 },
};
