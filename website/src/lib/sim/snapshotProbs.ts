// Auto-generated from M2 batch batch_20260610_205925Z on 2026-06-10T20:59:25Z.
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
  ALG: { pG: 0.4303, pR: 0.0993, pQ: 0.0165, pS: 0.005, pF: 0.002, pC: 0.0001 },
  ARG: { pG: 0.9555, pR: 0.6704, pQ: 0.4194, pS: 0.2729, pF: 0.2231, pC: 0.1462 },
  AUS: { pG: 0.6259, pR: 0.2924, pQ: 0.1354, pS: 0.0668, pF: 0.0164, pC: 0.0039 },
  AUT: { pG: 0.5038, pR: 0.1381, pQ: 0.0283, pS: 0.008, pF: 0.0043, pC: 0.0014 },
  BEL: { pG: 0.9755, pR: 0.5618, pQ: 0.2875, pS: 0.1682, pF: 0.0798, pC: 0.0347 },
  BIH: { pG: 0.2601, pR: 0.099, pQ: 0.0268, pS: 0.0052, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9743, pR: 0.7079, pQ: 0.4225, pS: 0.289, pF: 0.1311, pC: 0.0597 },
  CAN: { pG: 0.681, pR: 0.3379, pQ: 0.1455, pS: 0.0456, pF: 0.0105, pC: 0.0024 },
  CIV: { pG: 0.7747, pR: 0.4729, pQ: 0.1955, pS: 0.0805, pF: 0.0137, pC: 0.004 },
  COD: { pG: 0.2175, pR: 0.0387, pQ: 0.007, pS: 0.0003, pF: 0.0001, pC: 0.0001 },
  COL: { pG: 0.7479, pR: 0.3327, pQ: 0.1375, pS: 0.0432, pF: 0.0259, pC: 0.0105 },
  CPV: { pG: 0.1297, pR: 0.0565, pQ: 0.0133, pS: 0.0028, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7628, pR: 0.4121, pQ: 0.1716, pS: 0.0554, pF: 0.0345, pC: 0.017 },
  CUW: { pG: 0.177, pR: 0.1234, pQ: 0.0232, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6235, pR: 0.4135, pQ: 0.1623, pS: 0.0567, pF: 0.0094, pC: 0.0007 },
  ECU: { pG: 0.8692, pR: 0.5011, pQ: 0.2243, pS: 0.0937, pF: 0.0255, pC: 0.0062 },
  EGY: { pG: 0.833, pR: 0.4775, pQ: 0.2116, pS: 0.0969, pF: 0.0195, pC: 0.0038 },
  ENG: { pG: 0.9112, pR: 0.6317, pQ: 0.4185, pS: 0.1957, pF: 0.1529, pC: 0.0893 },
  ESP: { pG: 0.9765, pR: 0.7737, pQ: 0.5815, pS: 0.4251, pF: 0.3106, pC: 0.184 },
  FRA: { pG: 0.9354, pR: 0.7056, pQ: 0.4357, pS: 0.2829, pF: 0.2324, pC: 0.1509 },
  GER: { pG: 0.9693, pR: 0.628, pQ: 0.3854, pS: 0.1782, pF: 0.0878, pC: 0.0403 },
  GHA: { pG: 0.0515, pR: 0.0062, pQ: 0.0003, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1282, pR: 0.0953, pQ: 0.021, pS: 0.0028, pF: 0.0004, pC: 0.0 },
  IRN: { pG: 0.8978, pR: 0.4773, pQ: 0.2203, pS: 0.114, pF: 0.0299, pC: 0.0094 },
  IRQ: { pG: 0.1177, pR: 0.0199, pQ: 0.0027, pS: 0.0001, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1104, pR: 0.0132, pQ: 0.0013, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7096, pR: 0.3978, pQ: 0.1833, pS: 0.0708, pF: 0.0272, pC: 0.0092 },
  KOR: { pG: 0.8084, pR: 0.5326, pQ: 0.2566, pS: 0.1022, pF: 0.0261, pC: 0.0085 },
  KSA: { pG: 0.2166, pR: 0.0952, pQ: 0.025, pS: 0.0077, pF: 0.0001, pC: 0.0 },
  MAR: { pG: 0.9743, pR: 0.6956, pQ: 0.4085, pS: 0.278, pF: 0.1277, pC: 0.0585 },
  MEX: { pG: 0.9238, pR: 0.6526, pQ: 0.4165, pS: 0.1973, pF: 0.071, pC: 0.027 },
  NED: { pG: 0.8706, pR: 0.5926, pQ: 0.3798, pS: 0.1698, pF: 0.0973, pC: 0.0457 },
  NOR: { pG: 0.2817, pR: 0.0707, pQ: 0.0119, pS: 0.0037, pF: 0.0009, pC: 0.0003 },
  NZL: { pG: 0.1499, pR: 0.1093, pQ: 0.0224, pS: 0.0042, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2745, pR: 0.0841, pQ: 0.0195, pS: 0.0028, pF: 0.0014, pC: 0.0003 },
  PAR: { pG: 0.4449, pR: 0.2137, pQ: 0.0844, pS: 0.0341, pF: 0.0049, pC: 0.0008 },
  POR: { pG: 0.8501, pR: 0.465, pQ: 0.2401, pS: 0.0965, pF: 0.0663, pC: 0.0331 },
  QAT: { pG: 0.4283, pR: 0.182, pQ: 0.0581, pS: 0.0139, pF: 0.0008, pC: 0.0001 },
  RSA: { pG: 0.4356, pR: 0.2866, pQ: 0.095, pS: 0.0279, pF: 0.0034, pC: 0.0003 },
  SCO: { pG: 0.3775, pR: 0.2757, pQ: 0.1166, pS: 0.0465, pF: 0.0079, pC: 0.0009 },
  SEN: { pG: 0.6652, pR: 0.2828, pQ: 0.0842, pS: 0.0328, pF: 0.0209, pC: 0.0059 },
  SUI: { pG: 0.8393, pR: 0.4958, pQ: 0.2911, pS: 0.1194, pF: 0.0421, pC: 0.0127 },
  SWE: { pG: 0.3523, pR: 0.1615, pQ: 0.0574, pS: 0.0176, pF: 0.003, pC: 0.0007 },
  TUN: { pG: 0.2773, pR: 0.1227, pQ: 0.0374, pS: 0.011, pF: 0.0017, pC: 0.0003 },
  TUR: { pG: 0.663, pR: 0.3096, pQ: 0.1439, pS: 0.0737, pF: 0.0157, pC: 0.0055 },
  URU: { pG: 0.821, pR: 0.4487, pQ: 0.1521, pS: 0.0736, pF: 0.0321, pC: 0.0115 },
  USA: { pG: 0.8119, pR: 0.4098, pQ: 0.2158, pS: 0.1225, pF: 0.0386, pC: 0.014 },
  UZB: { pG: 0.1845, pR: 0.0295, pQ: 0.0055, pS: 0.0005, pF: 0.0001, pC: 0.0001 },
};
