// Auto-generated from M2 batch batch_20260617_232653Z on 2026-06-17T23:26:53Z.
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
  ALG: { pG: 0.4252, pR: 0.1008, pQ: 0.0162, pS: 0.0046, pF: 0.0019, pC: 0.0002 },
  ARG: { pG: 0.9511, pR: 0.6801, pQ: 0.419, pS: 0.2652, pF: 0.2146, pC: 0.141 },
  AUS: { pG: 0.5488, pR: 0.2202, pQ: 0.0902, pS: 0.0415, pF: 0.0102, pC: 0.0022 },
  AUT: { pG: 0.5136, pR: 0.1467, pQ: 0.0289, pS: 0.01, pF: 0.0039, pC: 0.0012 },
  BEL: { pG: 0.9741, pR: 0.5695, pQ: 0.2842, pS: 0.1705, pF: 0.0833, pC: 0.0378 },
  BIH: { pG: 0.2698, pR: 0.1052, pQ: 0.0276, pS: 0.0057, pF: 0.0, pC: 0.0 },
  BRA: { pG: 0.9743, pR: 0.7094, pQ: 0.4399, pS: 0.3027, pF: 0.1395, pC: 0.0629 },
  CAN: { pG: 0.6763, pR: 0.3308, pQ: 0.1414, pS: 0.0502, pF: 0.0116, pC: 0.0026 },
  CIV: { pG: 0.7719, pR: 0.4679, pQ: 0.193, pS: 0.0783, pF: 0.0154, pC: 0.0031 },
  COD: { pG: 0.2021, pR: 0.037, pQ: 0.0075, pS: 0.0011, pF: 0.0001, pC: 0.0 },
  COL: { pG: 0.7471, pR: 0.3258, pQ: 0.1379, pS: 0.0451, pF: 0.0266, pC: 0.0112 },
  CPV: { pG: 0.1303, pR: 0.0523, pQ: 0.0128, pS: 0.0036, pF: 0.0001, pC: 0.0 },
  CRO: { pG: 0.7535, pR: 0.4025, pQ: 0.1707, pS: 0.0564, pF: 0.0363, pC: 0.0147 },
  CUW: { pG: 0.1783, pR: 0.1221, pQ: 0.0248, pS: 0.0051, pF: 0.0001, pC: 0.0 },
  CZE: { pG: 0.6191, pR: 0.4099, pQ: 0.1628, pS: 0.0527, pF: 0.0086, pC: 0.0019 },
  ECU: { pG: 0.8654, pR: 0.4885, pQ: 0.2202, pS: 0.0937, pF: 0.0227, pC: 0.0055 },
  EGY: { pG: 0.8316, pR: 0.48, pQ: 0.2121, pS: 0.1006, pF: 0.0172, pC: 0.0045 },
  ENG: { pG: 0.9092, pR: 0.6368, pQ: 0.4126, pS: 0.1878, pF: 0.1439, pC: 0.0831 },
  ESP: { pG: 0.9783, pR: 0.7749, pQ: 0.5889, pS: 0.4316, pF: 0.3117, pC: 0.1898 },
  FRA: { pG: 0.9331, pR: 0.7044, pQ: 0.4396, pS: 0.289, pF: 0.2333, pC: 0.1483 },
  GER: { pG: 0.9695, pR: 0.6299, pQ: 0.3875, pS: 0.1768, pF: 0.0894, pC: 0.0379 },
  GHA: { pG: 0.0482, pR: 0.0059, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1325, pR: 0.1043, pQ: 0.0232, pS: 0.0034, pF: 0.0001, pC: 0.0 },
  IRN: { pG: 0.8967, pR: 0.4658, pQ: 0.2087, pS: 0.1054, pF: 0.0285, pC: 0.0082 },
  IRQ: { pG: 0.1165, pR: 0.0156, pQ: 0.0019, pS: 0.0004, pF: 0.0003, pC: 0.0 },
  JOR: { pG: 0.1101, pR: 0.0104, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7197, pR: 0.4088, pQ: 0.1884, pS: 0.0708, pF: 0.0309, pC: 0.011 },
  KOR: { pG: 0.8067, pR: 0.5239, pQ: 0.2542, pS: 0.0986, pF: 0.0213, pC: 0.0058 },
  KSA: { pG: 0.2098, pR: 0.0956, pQ: 0.0254, pS: 0.009, pF: 0.0007, pC: 0.0002 },
  MAR: { pG: 0.9748, pR: 0.7195, pQ: 0.4321, pS: 0.293, pF: 0.1373, pC: 0.0649 },
  MEX: { pG: 0.9218, pR: 0.6599, pQ: 0.4255, pS: 0.2045, pF: 0.0738, pC: 0.0278 },
  NED: { pG: 0.8689, pR: 0.5983, pQ: 0.3871, pS: 0.1694, pF: 0.0991, pC: 0.0429 },
  NOR: { pG: 0.2824, pR: 0.0703, pQ: 0.0115, pS: 0.0027, pF: 0.0011, pC: 0.0003 },
  NZL: { pG: 0.149, pR: 0.1086, pQ: 0.0179, pS: 0.0025, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.2891, pR: 0.0905, pQ: 0.0199, pS: 0.0028, pF: 0.0014, pC: 0.0004 },
  PAR: { pG: 0.3683, pR: 0.1391, pQ: 0.0504, pS: 0.0202, pF: 0.0039, pC: 0.0006 },
  POR: { pG: 0.8555, pR: 0.4672, pQ: 0.2459, pS: 0.0975, pF: 0.068, pC: 0.0344 },
  QAT: { pG: 0.4279, pR: 0.1871, pQ: 0.0628, pS: 0.016, pF: 0.0025, pC: 0.0005 },
  RSA: { pG: 0.4297, pR: 0.2752, pQ: 0.0934, pS: 0.0257, pF: 0.0022, pC: 0.0002 },
  SCO: { pG: 0.6356, pR: 0.4868, pQ: 0.2072, pS: 0.0789, pF: 0.011, pC: 0.0023 },
  SEN: { pG: 0.668, pR: 0.2717, pQ: 0.0821, pS: 0.0371, pF: 0.0232, pC: 0.0099 },
  SUI: { pG: 0.8487, pR: 0.508, pQ: 0.2941, pS: 0.1234, pF: 0.04, pC: 0.0124 },
  SWE: { pG: 0.35, pR: 0.1617, pQ: 0.0535, pS: 0.0171, pF: 0.0019, pC: 0.0002 },
  TUN: { pG: 0.2763, pR: 0.1228, pQ: 0.0379, pS: 0.0115, pF: 0.0018, pC: 0.0003 },
  TUR: { pG: 0.5955, pR: 0.2518, pQ: 0.1071, pS: 0.0508, pF: 0.0111, pC: 0.0043 },
  URU: { pG: 0.8302, pR: 0.4533, pQ: 0.1576, pS: 0.0782, pF: 0.0328, pC: 0.0113 },
  USA: { pG: 0.7702, pR: 0.3689, pQ: 0.1881, pS: 0.1086, pF: 0.0366, pC: 0.0142 },
  UZB: { pG: 0.1953, pR: 0.0343, pQ: 0.005, pS: 0.0003, pF: 0.0001, pC: 0.0 },
};
