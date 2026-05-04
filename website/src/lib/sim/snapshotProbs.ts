// Auto-generated from M0 snapshot 2026-05-04T00:00Z. Do not edit manually.
// Source: public/data/snapshots/2026-05-04T00:00Z/teams/*.json
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
  ALG: { pG: 0.325,  pR: 0.078,  pQ: 0.0137, pS: 0.0035, pF: 0.0021, pC: 0.0009 },
  ARG: { pG: 0.9361, pR: 0.6432, pQ: 0.4328, pS: 0.289,  pF: 0.2419, pC: 0.1408 },
  AUS: { pG: 0.5061, pR: 0.2361, pQ: 0.102,  pS: 0.0495, pF: 0.0114, pC: 0.0032 },
  AUT: { pG: 0.5162, pR: 0.1697, pQ: 0.0399, pS: 0.0136, pF: 0.0077, pC: 0.002  },
  BEL: { pG: 0.9232, pR: 0.4508, pQ: 0.1759, pS: 0.0929, pF: 0.0343, pC: 0.0128 },
  BIH: { pG: 0.3816, pR: 0.1668, pQ: 0.0463, pS: 0.013,  pF: 0.0011, pC: 0.0    },
  BRA: { pG: 0.9642, pR: 0.6941, pQ: 0.4863, pS: 0.3312, pF: 0.142,  pC: 0.0697 },
  CAN: { pG: 0.7975, pR: 0.4279, pQ: 0.1887, pS: 0.0743, pF: 0.0181, pC: 0.0056 },
  CIV: { pG: 0.6706, pR: 0.4635, pQ: 0.2016, pS: 0.0738, pF: 0.0102, pC: 0.002  },
  COD: { pG: 0.1537, pR: 0.0307, pQ: 0.0053, pS: 0.0011, pF: 0.0005, pC: 0.0    },
  COL: { pG: 0.7869, pR: 0.4288, pQ: 0.2183, pS: 0.0881, pF: 0.0612, pC: 0.0252 },
  CPV: { pG: 0.1492, pR: 0.0742, pQ: 0.0154, pS: 0.0032, pF: 0.0005, pC: 0.0    },
  CRO: { pG: 0.7703, pR: 0.3904, pQ: 0.1753, pS: 0.0605, pF: 0.0385, pC: 0.0136 },
  CUW: { pG: 0.1498, pR: 0.1142, pQ: 0.0221, pS: 0.003,  pF: 0.0,    pC: 0.0    },
  CZE: { pG: 0.7666, pR: 0.4752, pQ: 0.1931, pS: 0.0778, pF: 0.0128, pC: 0.0029 },
  ECU: { pG: 0.9664, pR: 0.5938, pQ: 0.3516, pS: 0.1493, pF: 0.0738, pC: 0.0306 },
  EGY: { pG: 0.6911, pR: 0.3482, pQ: 0.1354, pS: 0.0503, pF: 0.0075, pC: 0.0018 },
  ENG: { pG: 0.8807, pR: 0.5419, pQ: 0.3255, pS: 0.1472, pF: 0.1055, pC: 0.0555 },
  ESP: { pG: 0.9884, pR: 0.8823, pQ: 0.7386, pS: 0.569,  pF: 0.4532, pC: 0.3091 },
  FRA: { pG: 0.8654, pR: 0.599,  pQ: 0.3551, pS: 0.227,  pF: 0.1778, pC: 0.1027 },
  GER: { pG: 0.9635, pR: 0.5976, pQ: 0.3309, pS: 0.1371, pF: 0.0634, pC: 0.0265 },
  GHA: { pG: 0.0464, pR: 0.0046, pQ: 0.0004, pS: 0.0,    pF: 0.0,    pC: 0.0    },
  HAI: { pG: 0.2178, pR: 0.1433, pQ: 0.0404, pS: 0.0107, pF: 0.0005, pC: 0.0    },
  IRN: { pG: 0.803,  pR: 0.3773, pQ: 0.1481, pS: 0.0655, pF: 0.0157, pC: 0.0038 },
  IRQ: { pG: 0.0728, pR: 0.0104, pQ: 0.0007, pS: 0.0,    pF: 0.0,    pC: 0.0    },
  JOR: { pG: 0.2227, pR: 0.044,  pQ: 0.0061, pS: 0.0009, pF: 0.0004, pC: 0.0    },
  JPN: { pG: 0.7789, pR: 0.4304, pQ: 0.2127, pS: 0.0791, pF: 0.0374, pC: 0.012  },
  KOR: { pG: 0.8141, pR: 0.4936, pQ: 0.2176, pS: 0.0881, pF: 0.0185, pC: 0.0052 },
  KSA: { pG: 0.1714, pR: 0.0853, pQ: 0.0192, pS: 0.0045, pF: 0.0005, pC: 0.0001 },
  MAR: { pG: 0.8314, pR: 0.5356, pQ: 0.2728, pS: 0.1473, pF: 0.0351, pC: 0.0101 },
  MEX: { pG: 0.9197, pR: 0.6048, pQ: 0.3549, pS: 0.175,  pF: 0.0488, pC: 0.0169 },
  NED: { pG: 0.8551, pR: 0.5208, pQ: 0.3111, pS: 0.1205, pF: 0.0682, pC: 0.029  },
  NOR: { pG: 0.5718, pR: 0.2547, pQ: 0.0883, pS: 0.0393, pF: 0.0258, pC: 0.0097 },
  NZL: { pG: 0.4394, pR: 0.2506, pQ: 0.0778, pS: 0.0236, pF: 0.002,  pC: 0.0003 },
  PAN: { pG: 0.3026, pR: 0.0889, pQ: 0.0198, pS: 0.0029, pF: 0.0012, pC: 0.0002 },
  PAR: { pG: 0.6122, pR: 0.3056, pQ: 0.1419, pS: 0.0745, pF: 0.0197, pC: 0.007  },
  POR: { pG: 0.8029, pR: 0.4492, pQ: 0.2414, pS: 0.0986, pF: 0.0694, pC: 0.031  },
  QAT: { pG: 0.117,  pR: 0.0479, pQ: 0.0069, pS: 0.0007, pF: 0.0,    pC: 0.0    },
  RSA: { pG: 0.2979, pR: 0.1881, pQ: 0.0392, pS: 0.0095, pF: 0.0005, pC: 0.0    },
  SCO: { pG: 0.7552, pR: 0.4892, pQ: 0.2366, pS: 0.1141, pF: 0.0246, pC: 0.0061 },
  SEN: { pG: 0.49,   pR: 0.201,  pQ: 0.0634, pS: 0.0261, pF: 0.014,  pC: 0.0047 },
  SUI: { pG: 0.9056, pR: 0.5957, pQ: 0.3703, pS: 0.1822, pF: 0.0585, pC: 0.0232 },
  SWE: { pG: 0.3866, pR: 0.1789, pQ: 0.0746, pS: 0.0259, pF: 0.0042, pC: 0.0011 },
  TUN: { pG: 0.2291, pR: 0.1008, pQ: 0.0378, pS: 0.0104, pF: 0.0015, pC: 0.0001 },
  TUR: { pG: 0.7522, pR: 0.4367, pQ: 0.2385, pS: 0.1479, pF: 0.0493, pC: 0.0194 },
  URU: { pG: 0.8343, pR: 0.5313, pQ: 0.1472, pS: 0.0714, pF: 0.0358, pC: 0.0138 },
  USA: { pG: 0.3609, pR: 0.1594, pQ: 0.0645, pS: 0.0247, pF: 0.0039, pC: 0.0009 },
  UZB: { pG: 0.2565, pR: 0.0655, pQ: 0.014,  pS: 0.0022, pF: 0.001,  pC: 0.0005 },
};
