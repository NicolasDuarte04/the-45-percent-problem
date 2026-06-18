// Auto-generated from M2 batch batch_20260618_033104Z on 2026-06-18T03:31:04Z.
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
  ALG: { pG: 0.4305, pR: 0.0997, pQ: 0.02, pS: 0.0054, pF: 0.002, pC: 0.0005 },
  ARG: { pG: 0.9498, pR: 0.6786, pQ: 0.4152, pS: 0.2686, pF: 0.219, pC: 0.142 },
  AUS: { pG: 0.5571, pR: 0.2264, pQ: 0.0976, pS: 0.0474, pF: 0.0112, pC: 0.0028 },
  AUT: { pG: 0.5127, pR: 0.142, pQ: 0.0261, pS: 0.0076, pF: 0.0034, pC: 0.0006 },
  BEL: { pG: 0.9724, pR: 0.5645, pQ: 0.2813, pS: 0.1669, pF: 0.0793, pC: 0.0345 },
  BIH: { pG: 0.2636, pR: 0.1081, pQ: 0.029, pS: 0.0058, pF: 0.0002, pC: 0.0 },
  BRA: { pG: 0.974, pR: 0.7199, pQ: 0.4373, pS: 0.3028, pF: 0.1414, pC: 0.0626 },
  CAN: { pG: 0.6789, pR: 0.3428, pQ: 0.1476, pS: 0.0487, pF: 0.0109, pC: 0.0028 },
  CIV: { pG: 0.7703, pR: 0.47, pQ: 0.1906, pS: 0.0769, pF: 0.0132, pC: 0.0026 },
  COD: { pG: 0.2103, pR: 0.0399, pQ: 0.0067, pS: 0.0007, pF: 0.0002, pC: 0.0 },
  COL: { pG: 0.7419, pR: 0.3275, pQ: 0.1326, pS: 0.0408, pF: 0.0247, pC: 0.0099 },
  CPV: { pG: 0.1332, pR: 0.0545, pQ: 0.0112, pS: 0.0024, pF: 0.0, pC: 0.0 },
  CRO: { pG: 0.7712, pR: 0.4135, pQ: 0.1796, pS: 0.059, pF: 0.0368, pC: 0.0171 },
  CUW: { pG: 0.1771, pR: 0.1179, pQ: 0.0227, pS: 0.0046, pF: 0.0003, pC: 0.0 },
  CZE: { pG: 0.629, pR: 0.4046, pQ: 0.1649, pS: 0.0573, pF: 0.009, pC: 0.0019 },
  ECU: { pG: 0.8627, pR: 0.4932, pQ: 0.2187, pS: 0.0928, pF: 0.0238, pC: 0.0069 },
  EGY: { pG: 0.8254, pR: 0.4759, pQ: 0.2103, pS: 0.0988, pF: 0.0212, pC: 0.0054 },
  ENG: { pG: 0.9088, pR: 0.6321, pQ: 0.4098, pS: 0.1955, pF: 0.1481, pC: 0.0895 },
  ESP: { pG: 0.9775, pR: 0.777, pQ: 0.5958, pS: 0.431, pF: 0.3133, pC: 0.1889 },
  FRA: { pG: 0.9322, pR: 0.7024, pQ: 0.4372, pS: 0.2799, pF: 0.2225, pC: 0.1463 },
  GER: { pG: 0.9742, pR: 0.6283, pQ: 0.387, pS: 0.1759, pF: 0.091, pC: 0.0409 },
  GHA: { pG: 0.0498, pR: 0.0062, pQ: 0.0008, pS: 0.0, pF: 0.0, pC: 0.0 },
  HAI: { pG: 0.1334, pR: 0.1037, pQ: 0.0227, pS: 0.0036, pF: 0.0003, pC: 0.0 },
  IRN: { pG: 0.8876, pR: 0.4669, pQ: 0.2153, pS: 0.1097, pF: 0.0284, pC: 0.0084 },
  IRQ: { pG: 0.1248, pR: 0.0172, pQ: 0.0016, pS: 0.0003, pF: 0.0001, pC: 0.0 },
  JOR: { pG: 0.107, pR: 0.01, pQ: 0.0008, pS: 0.0002, pF: 0.0, pC: 0.0 },
  JPN: { pG: 0.7085, pR: 0.4001, pQ: 0.1827, pS: 0.0673, pF: 0.0297, pC: 0.0095 },
  KOR: { pG: 0.8074, pR: 0.5241, pQ: 0.2525, pS: 0.103, pF: 0.0254, pC: 0.0067 },
  KSA: { pG: 0.2142, pR: 0.096, pQ: 0.0252, pS: 0.0066, pF: 0.0006, pC: 0.0 },
  MAR: { pG: 0.9703, pR: 0.7107, pQ: 0.4271, pS: 0.2888, pF: 0.1275, pC: 0.0575 },
  MEX: { pG: 0.9197, pR: 0.6456, pQ: 0.4202, pS: 0.2003, pF: 0.0714, pC: 0.0256 },
  NED: { pG: 0.8701, pR: 0.5963, pQ: 0.3853, pS: 0.1786, pF: 0.107, pC: 0.0508 },
  NOR: { pG: 0.2794, pR: 0.069, pQ: 0.012, pS: 0.0024, pF: 0.0013, pC: 0.0005 },
  NZL: { pG: 0.1602, pR: 0.1134, pQ: 0.0221, pS: 0.0032, pF: 0.0001, pC: 0.0 },
  PAN: { pG: 0.2702, pR: 0.0828, pQ: 0.0181, pS: 0.0021, pF: 0.0006, pC: 0.0002 },
  PAR: { pG: 0.3622, pR: 0.1385, pQ: 0.049, pS: 0.0184, pF: 0.0029, pC: 0.0003 },
  POR: { pG: 0.857, pR: 0.4672, pQ: 0.2469, pS: 0.0979, pF: 0.0668, pC: 0.0321 },
  QAT: { pG: 0.4314, pR: 0.1851, pQ: 0.0617, pS: 0.0147, pF: 0.0024, pC: 0.0002 },
  RSA: { pG: 0.4239, pR: 0.2757, pQ: 0.0898, pS: 0.0246, pF: 0.0026, pC: 0.0005 },
  SCO: { pG: 0.6293, pR: 0.4829, pQ: 0.2059, pS: 0.0807, pF: 0.0128, pC: 0.0031 },
  SEN: { pG: 0.6636, pR: 0.2811, pQ: 0.0871, pS: 0.039, pF: 0.0239, pC: 0.0102 },
  SUI: { pG: 0.8461, pR: 0.514, pQ: 0.2983, pS: 0.1243, pF: 0.0362, pC: 0.0122 },
  SWE: { pG: 0.3539, pR: 0.1661, pQ: 0.056, pS: 0.0176, pF: 0.0029, pC: 0.0002 },
  TUN: { pG: 0.2832, pR: 0.1281, pQ: 0.0422, pS: 0.0136, pF: 0.0024, pC: 0.0007 },
  TUR: { pG: 0.6135, pR: 0.2548, pQ: 0.1127, pS: 0.0535, pF: 0.0124, pC: 0.0025 },
  URU: { pG: 0.8295, pR: 0.4518, pQ: 0.1536, pS: 0.0725, pF: 0.0318, pC: 0.0097 },
  USA: { pG: 0.7602, pR: 0.3631, pQ: 0.1837, pS: 0.1077, pF: 0.039, pC: 0.0139 },
  UZB: { pG: 0.1908, pR: 0.0308, pQ: 0.0055, pS: 0.0006, pF: 0.0, pC: 0.0 },
};
