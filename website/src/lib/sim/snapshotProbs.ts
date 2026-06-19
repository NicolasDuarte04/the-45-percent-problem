// Auto-generated from M2 batch batch_20260619_111922Z on 2026-06-19T11:19:22Z.
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
  ALG: { pG: 0.4276, pR: 0.1007, pQ: 0.019, pS: 0.0048, pF: 0.0026, pC: 0.0008 },
  ARG: { pG: 0.9492, pR: 0.6733, pQ: 0.4181, pS: 0.2741, pF: 0.2185, pC: 0.1394 },
  AUS: { pG: 0.5603, pR: 0.2377, pQ: 0.0985, pS: 0.0481, pF: 0.0117, pC: 0.0032 },
  AUT: { pG: 0.5104, pR: 0.1388, pQ: 0.0297, pS: 0.0087, pF: 0.0042, pC: 0.0016 },
  BEL: { pG: 0.9741, pR: 0.5608, pQ: 0.2796, pS: 0.164, pF: 0.0771, pC: 0.034 },
  BIH: { pG: 0.2674, pR: 0.1087, pQ: 0.0274, pS: 0.0047, pF: 0.0003, pC: 0.0 },
  BRA: { pG: 0.9721, pR: 0.7091, pQ: 0.4321, pS: 0.2971, pF: 0.1378, pC: 0.0671 },
  CAN: { pG: 0.6851, pR: 0.3364, pQ: 0.1473, pS: 0.0478, pF: 0.0092, pC: 0.0017 },
  CIV: { pG: 0.7681, pR: 0.4643, pQ: 0.189, pS: 0.0735, pF: 0.0128, pC: 0.0027 },
  COD: { pG: 0.2118, pR: 0.0401, pQ: 0.0073, pS: 0.0004, pF: 0.0002, pC: 0.0001 },
  COL: { pG: 0.747, pR: 0.3281, pQ: 0.1328, pS: 0.0412, pF: 0.0251, pC: 0.011 },
  CPV: { pG: 0.1345, pR: 0.0619, pQ: 0.0137, pS: 0.0033, pF: 0.0002, pC: 0.0 },
  CRO: { pG: 0.7653, pR: 0.4085, pQ: 0.1755, pS: 0.059, pF: 0.0374, pC: 0.0158 },
  CUW: { pG: 0.1794, pR: 0.1242, pQ: 0.0277, pS: 0.005, pF: 0.0002, pC: 0.0 },
  CZE: { pG: 0.6256, pR: 0.4082, pQ: 0.1582, pS: 0.0572, pF: 0.008, pC: 0.0014 },
  ECU: { pG: 0.8657, pR: 0.4933, pQ: 0.227, pS: 0.0929, pF: 0.0251, pC: 0.0066 },
  EGY: { pG: 0.8222, pR: 0.4684, pQ: 0.2041, pS: 0.0908, pF: 0.0188, pC: 0.0039 },
  ENG: { pG: 0.907, pR: 0.6304, pQ: 0.413, pS: 0.1913, pF: 0.1426, pC: 0.0805 },
  ESP: { pG: 0.9798, pR: 0.7856, pQ: 0.5943, pS: 0.4309, pF: 0.3123, pC: 0.1918 },
  FRA: { pG: 0.9339, pR: 0.7073, pQ: 0.4306, pS: 0.2752, pF: 0.2201, pC: 0.1391 },
  GER: { pG: 0.9735, pR: 0.6327, pQ: 0.3862, pS: 0.1787, pF: 0.0898, pC: 0.0398 },
  GHA: { pG: 0.0497, pR: 0.0063, pQ: 0.0006, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1329, pR: 0.106, pQ: 0.0231, pS: 0.0035, pF: 0.0001, pC: 0.0001 },
  IRN: { pG: 0.895, pR: 0.4763, pQ: 0.2211, pS: 0.113, pF: 0.0325, pC: 0.0083 },
  IRQ: { pG: 0.1187, pR: 0.019, pQ: 0.0015, pS: 0.0003, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.1128, pR: 0.0126, pQ: 0.0012, pS: 0.0002, pF: 0.0001, pC: 0.0 },
  JPN: { pG: 0.7088, pR: 0.3986, pQ: 0.1828, pS: 0.0689, pF: 0.0294, pC: 0.0114 },
  KOR: { pG: 0.8087, pR: 0.5228, pQ: 0.2563, pS: 0.0999, pF: 0.0247, pC: 0.0074 },
  KSA: { pG: 0.209, pR: 0.0946, pQ: 0.0245, pS: 0.006, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.9713, pR: 0.7133, pQ: 0.4361, pS: 0.2925, pF: 0.1334, pC: 0.0627 },
  MEX: { pG: 0.9198, pR: 0.6538, pQ: 0.4151, pS: 0.1998, pF: 0.0725, pC: 0.0246 },
  NED: { pG: 0.8752, pR: 0.6029, pQ: 0.3909, pS: 0.1813, pF: 0.1026, pC: 0.047 },
  NOR: { pG: 0.2821, pR: 0.069, pQ: 0.0125, pS: 0.0025, pF: 0.0015, pC: 0.0004 },
  NZL: { pG: 0.1546, pR: 0.1062, pQ: 0.0189, pS: 0.0031, pF: 0.0, pC: 0.0 },
  PAN: { pG: 0.278, pR: 0.0862, pQ: 0.0182, pS: 0.0027, pF: 0.0007, pC: 0.0002 },
  PAR: { pG: 0.3688, pR: 0.1457, pQ: 0.0555, pS: 0.0235, pF: 0.0036, pC: 0.0008 },
  POR: { pG: 0.8537, pR: 0.4689, pQ: 0.2472, pS: 0.103, pF: 0.07, pC: 0.0351 },
  QAT: { pG: 0.422, pR: 0.1809, pQ: 0.057, pS: 0.0146, pF: 0.002, pC: 0.0003 },
  RSA: { pG: 0.4294, pR: 0.2746, pQ: 0.0859, pS: 0.0223, pF: 0.0015, pC: 0.0 },
  SCO: { pG: 0.6291, pR: 0.4768, pQ: 0.206, pS: 0.0806, pF: 0.0119, pC: 0.002 },
  SEN: { pG: 0.6653, pR: 0.2793, pQ: 0.0874, pS: 0.036, pF: 0.0231, pC: 0.0092 },
  SUI: { pG: 0.842, pR: 0.5146, pQ: 0.3103, pS: 0.1374, pF: 0.047, pC: 0.0158 },
  SWE: { pG: 0.3498, pR: 0.1598, pQ: 0.0551, pS: 0.0167, pF: 0.0026, pC: 0.0004 },
  TUN: { pG: 0.2795, pR: 0.1242, pQ: 0.0352, pS: 0.0096, pF: 0.0017, pC: 0.0003 },
  TUR: { pG: 0.5986, pR: 0.2512, pQ: 0.1096, pS: 0.0534, pF: 0.0139, pC: 0.0042 },
  URU: { pG: 0.8308, pR: 0.4462, pQ: 0.1499, pS: 0.0742, pF: 0.0328, pC: 0.0135 },
  USA: { pG: 0.7669, pR: 0.3602, pQ: 0.1816, pS: 0.1057, pF: 0.0377, pC: 0.0157 },
  UZB: { pG: 0.1875, pR: 0.0315, pQ: 0.0054, pS: 0.0006, pF: 0.0002, pC: 0.0 },
};
