// Auto-generated from M2 batch batch_20260620_020749Z on 2026-06-20T02:07:49Z.
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
  ALG: { pG: 0.4248, pR: 0.1006, pQ: 0.0173, pS: 0.0039, pF: 0.0017, pC: 0.0004 },
  ARG: { pG: 0.9513, pR: 0.6758, pQ: 0.4148, pS: 0.2697, pF: 0.2206, pC: 0.1402 },
  AUS: { pG: 0.558, pR: 0.2366, pQ: 0.1027, pS: 0.0481, pF: 0.0103, pC: 0.0021 },
  AUT: { pG: 0.5114, pR: 0.1386, pQ: 0.0287, pS: 0.0076, pF: 0.0036, pC: 0.0011 },
  BEL: { pG: 0.9745, pR: 0.5686, pQ: 0.2779, pS: 0.1645, pF: 0.0781, pC: 0.0335 },
  BIH: { pG: 0.2786, pR: 0.1059, pQ: 0.0247, pS: 0.0043, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9724, pR: 0.7159, pQ: 0.4448, pS: 0.3054, pF: 0.1428, pC: 0.0691 },
  CAN: { pG: 0.674, pR: 0.336, pQ: 0.1477, pS: 0.0485, pF: 0.01, pC: 0.0032 },
  CIV: { pG: 0.774, pR: 0.4709, pQ: 0.1913, pS: 0.0778, pF: 0.0154, pC: 0.0039 },
  COD: { pG: 0.2125, pR: 0.0438, pQ: 0.007, pS: 0.0008, pF: 0.0004, pC: 0.0 },
  COL: { pG: 0.7439, pR: 0.3311, pQ: 0.1395, pS: 0.0436, pF: 0.0257, pC: 0.0112 },
  CPV: { pG: 0.1293, pR: 0.0537, pQ: 0.0126, pS: 0.0032, pF: 0.0003, pC: 0.0 },
  CRO: { pG: 0.7612, pR: 0.4062, pQ: 0.1726, pS: 0.0576, pF: 0.0387, pC: 0.0156 },
  CUW: { pG: 0.1739, pR: 0.1215, pQ: 0.0252, pS: 0.0047, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.6224, pR: 0.4111, pQ: 0.1651, pS: 0.0548, pF: 0.0089, pC: 0.0013 },
  ECU: { pG: 0.8728, pR: 0.499, pQ: 0.2265, pS: 0.0972, pF: 0.0267, pC: 0.0085 },
  EGY: { pG: 0.8273, pR: 0.4872, pQ: 0.216, pS: 0.0978, pF: 0.0196, pC: 0.0043 },
  ENG: { pG: 0.9094, pR: 0.6226, pQ: 0.4053, pS: 0.1882, pF: 0.1418, pC: 0.0833 },
  ESP: { pG: 0.9774, pR: 0.7745, pQ: 0.5891, pS: 0.429, pF: 0.3163, pC: 0.1873 },
  FRA: { pG: 0.9341, pR: 0.7057, pQ: 0.4431, pS: 0.2899, pF: 0.2324, pC: 0.149 },
  GER: { pG: 0.9691, pR: 0.6359, pQ: 0.3905, pS: 0.1768, pF: 0.0898, pC: 0.0399 },
  GHA: { pG: 0.0487, pR: 0.0046, pQ: 0.0002, pS: 0.0001, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1381, pR: 0.1086, pQ: 0.023, pS: 0.0043, pF: 0.0002, pC: 0.0 },
  IRN: { pG: 0.8923, pR: 0.4633, pQ: 0.212, pS: 0.1043, pF: 0.029, pC: 0.0077 },
  IRQ: { pG: 0.1221, pR: 0.0174, pQ: 0.0024, pS: 0.0004, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.1125, pR: 0.0111, pQ: 0.0009, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7101, pR: 0.399, pQ: 0.1873, pS: 0.0719, pF: 0.031, pC: 0.0108 },
  KOR: { pG: 0.8115, pR: 0.5245, pQ: 0.256, pS: 0.1087, pF: 0.0235, pC: 0.0064 },
  KSA: { pG: 0.2149, pR: 0.1001, pQ: 0.0246, pS: 0.0075, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9743, pR: 0.7029, pQ: 0.4159, pS: 0.2807, pF: 0.1232, pC: 0.0584 },
  MEX: { pG: 0.9239, pR: 0.6583, pQ: 0.4235, pS: 0.2119, pF: 0.0746, pC: 0.029 },
  NED: { pG: 0.8669, pR: 0.5902, pQ: 0.3769, pS: 0.173, pF: 0.0996, pC: 0.0466 },
  NOR: { pG: 0.282, pR: 0.0725, pQ: 0.0102, pS: 0.0027, pF: 0.0011, pC: 0.0001 },
  NZL: { pG: 0.1518, pR: 0.1129, pQ: 0.0226, pS: 0.0046, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2807, pR: 0.0789, pQ: 0.0164, pS: 0.0029, pF: 0.0012, pC: 0.0003 },
  PAR: { pG: 0.3678, pR: 0.1361, pQ: 0.0515, pS: 0.0189, pF: 0.0031, pC: 0.0002 },
  POR: { pG: 0.8575, pR: 0.4764, pQ: 0.2523, pS: 0.1004, pF: 0.0681, pC: 0.0359 },
  QAT: { pG: 0.4232, pR: 0.1803, pQ: 0.0605, pS: 0.0154, pF: 0.0024, pC: 0.0003 },
  RSA: { pG: 0.4283, pR: 0.2775, pQ: 0.0856, pS: 0.0231, pF: 0.0018, pC: 0.0003 },
  SCO: { pG: 0.6282, pR: 0.4842, pQ: 0.2058, pS: 0.0797, pF: 0.0118, pC: 0.0022 },
  SEN: { pG: 0.6618, pR: 0.2783, pQ: 0.0826, pS: 0.0315, pF: 0.0192, pC: 0.008 },
  SUI: { pG: 0.8381, pR: 0.5064, pQ: 0.2956, pS: 0.1226, pF: 0.0398, pC: 0.0121 },
  SWE: { pG: 0.353, pR: 0.1593, pQ: 0.0518, pS: 0.0167, pF: 0.0032, pC: 0.0008 },
  TUN: { pG: 0.2802, pR: 0.1242, pQ: 0.0433, pS: 0.0109, pF: 0.0018, pC: 0.0002 },
  TUR: { pG: 0.603, pR: 0.2557, pQ: 0.1137, pS: 0.0551, pF: 0.0141, pC: 0.004 },
  URU: { pG: 0.8325, pR: 0.4397, pQ: 0.1524, pS: 0.0742, pF: 0.0319, pC: 0.0115 },
  USA: { pG: 0.7582, pR: 0.36, pQ: 0.1839, pS: 0.1044, pF: 0.0346, pC: 0.0112 },
  UZB: { pG: 0.1861, pR: 0.0364, pQ: 0.0067, pS: 0.0006, pF: 0.0002, pC: 0.0 },
};
