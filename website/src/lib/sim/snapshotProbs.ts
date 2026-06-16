// Auto-generated from M2 batch batch_20260616_023640Z on 2026-06-16T02:36:40Z.
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
  ALG: { pG: 0.4265, pR: 0.1068, pQ: 0.0184, pS: 0.0036, pF: 0.0013, pC: 0.0005 },
  ARG: { pG: 0.9556, pR: 0.676, pQ: 0.4185, pS: 0.2747, pF: 0.2208, pC: 0.1454 },
  AUS: { pG: 0.5563, pR: 0.234, pQ: 0.0974, pS: 0.0463, pF: 0.0138, pC: 0.0032 },
  AUT: { pG: 0.5099, pR: 0.1396, pQ: 0.0265, pS: 0.0085, pF: 0.0041, pC: 0.001 },
  BEL: { pG: 0.974, pR: 0.5702, pQ: 0.2872, pS: 0.1681, pF: 0.0817, pC: 0.0391 },
  BIH: { pG: 0.2699, pR: 0.1042, pQ: 0.0265, pS: 0.0065, pF: 0.0008, pC: 0.0 },
  BRA: { pG: 0.9739, pR: 0.7102, pQ: 0.4349, pS: 0.2976, pF: 0.1402, pC: 0.0647 },
  CAN: { pG: 0.6728, pR: 0.3298, pQ: 0.1393, pS: 0.0436, pF: 0.0099, pC: 0.0033 },
  CIV: { pG: 0.7732, pR: 0.476, pQ: 0.1982, pS: 0.0768, pF: 0.0138, pC: 0.0026 },
  COD: { pG: 0.2115, pR: 0.0423, pQ: 0.0065, pS: 0.0009, pF: 0.0005, pC: 0.0001 },
  COL: { pG: 0.744, pR: 0.3262, pQ: 0.137, pS: 0.0408, pF: 0.0255, pC: 0.0105 },
  CPV: { pG: 0.1339, pR: 0.0572, pQ: 0.013, pS: 0.0033, pF: 0.0005, pC: 0.0001 },
  CRO: { pG: 0.7633, pR: 0.4158, pQ: 0.1793, pS: 0.0592, pF: 0.039, pC: 0.017 },
  CUW: { pG: 0.1752, pR: 0.1157, pQ: 0.0247, pS: 0.0047, pF: 0.0, pC: 0.0 },
  CZE: { pG: 0.6216, pR: 0.4133, pQ: 0.1619, pS: 0.0549, pF: 0.0071, pC: 0.0015 },
  ECU: { pG: 0.8652, pR: 0.4947, pQ: 0.2216, pS: 0.0936, pF: 0.0238, pC: 0.0062 },
  EGY: { pG: 0.8286, pR: 0.4781, pQ: 0.2102, pS: 0.0973, pF: 0.0204, pC: 0.0051 },
  ENG: { pG: 0.9039, pR: 0.6286, pQ: 0.4063, pS: 0.1924, pF: 0.1468, pC: 0.0865 },
  ESP: { pG: 0.9765, pR: 0.7705, pQ: 0.5868, pS: 0.4206, pF: 0.306, pC: 0.1857 },
  FRA: { pG: 0.9382, pR: 0.702, pQ: 0.4373, pS: 0.2868, pF: 0.2305, pC: 0.1472 },
  GER: { pG: 0.9703, pR: 0.626, pQ: 0.3836, pS: 0.1776, pF: 0.0886, pC: 0.0386 },
  GHA: { pG: 0.0494, pR: 0.0058, pQ: 0.0005, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1327, pR: 0.104, pQ: 0.0236, pS: 0.0043, pF: 0.0001, pC: 0.0001 },
  IRN: { pG: 0.8922, pR: 0.4741, pQ: 0.2162, pS: 0.11, pF: 0.0293, pC: 0.0094 },
  IRQ: { pG: 0.1195, pR: 0.0174, pQ: 0.0025, pS: 0.0001, pF: 0.0, pC: 0.0 },
  JOR: { pG: 0.108, pR: 0.011, pQ: 0.0002, pS: 0.0, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7157, pR: 0.4037, pQ: 0.1847, pS: 0.0675, pF: 0.0285, pC: 0.0103 },
  KOR: { pG: 0.8055, pR: 0.5223, pQ: 0.2513, pS: 0.0973, pF: 0.0215, pC: 0.0052 },
  KSA: { pG: 0.2121, pR: 0.0936, pQ: 0.0238, pS: 0.0074, pF: 0.0007, pC: 0.0001 },
  MAR: { pG: 0.9721, pR: 0.7031, pQ: 0.4226, pS: 0.2919, pF: 0.1264, pC: 0.0601 },
  MEX: { pG: 0.9192, pR: 0.6582, pQ: 0.4265, pS: 0.2078, pF: 0.0732, pC: 0.0268 },
  NED: { pG: 0.8707, pR: 0.6001, pQ: 0.3883, pS: 0.1838, pF: 0.1068, pC: 0.0469 },
  NOR: { pG: 0.2805, pR: 0.0654, pQ: 0.012, pS: 0.0023, pF: 0.0006, pC: 0.0 },
  NZL: { pG: 0.1568, pR: 0.112, pQ: 0.0224, pS: 0.0046, pF: 0.0002, pC: 0.0 },
  PAN: { pG: 0.2834, pR: 0.0817, pQ: 0.0188, pS: 0.0026, pF: 0.0007, pC: 0.0002 },
  PAR: { pG: 0.3756, pR: 0.1419, pQ: 0.0531, pS: 0.0196, pF: 0.0026, pC: 0.0005 },
  POR: { pG: 0.8594, pR: 0.4692, pQ: 0.2462, pS: 0.0958, pF: 0.0657, pC: 0.0313 },
  QAT: { pG: 0.4274, pR: 0.1834, pQ: 0.061, pS: 0.0155, pF: 0.0022, pC: 0.0003 },
  RSA: { pG: 0.4376, pR: 0.2829, pQ: 0.0923, pS: 0.0282, pF: 0.002, pC: 0.0001 },
  SCO: { pG: 0.6258, pR: 0.4767, pQ: 0.2052, pS: 0.0775, pF: 0.011, pC: 0.0021 },
  SEN: { pG: 0.6618, pR: 0.2818, pQ: 0.0846, pS: 0.032, pF: 0.0197, pC: 0.0065 },
  SUI: { pG: 0.846, pR: 0.5059, pQ: 0.3011, pS: 0.1271, pF: 0.0435, pC: 0.0138 },
  SWE: { pG: 0.349, pR: 0.1598, pQ: 0.0542, pS: 0.0181, pF: 0.0039, pC: 0.0013 },
  TUN: { pG: 0.2807, pR: 0.124, pQ: 0.037, pS: 0.011, pF: 0.0016, pC: 0.0005 },
  TUR: { pG: 0.6023, pR: 0.2655, pQ: 0.1177, pS: 0.0591, pF: 0.0177, pC: 0.004 },
  URU: { pG: 0.8259, pR: 0.4443, pQ: 0.1481, pS: 0.0719, pF: 0.032, pC: 0.0107 },
  USA: { pG: 0.7613, pR: 0.3646, pQ: 0.1856, pS: 0.1065, pF: 0.035, pC: 0.0115 },
  UZB: { pG: 0.1851, pR: 0.0304, pQ: 0.0054, pS: 0.0003, pF: 0.0, pC: 0.0 },
};
