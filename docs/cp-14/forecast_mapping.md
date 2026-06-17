# cp-14 forecast mapping audit (model side)

Exact bijection between published match ids (M01..M72) and the frozen pre-tournament champion batch group slots. Built from committed, outcome-blind artifacts only.

- Champion batch: `batch_20260512_013228Z`
- Batch activated (UTC): `2026-05-12T01:33:11Z`
- Batch path: `outputs/phase5/batches/batch_20260512_013228Z/match_runs_M2.parquet`
- Reference date: `2026-06-16` (kicked off: 15 of 72)

The FD-side join (settled `match_outcomes` -> M{NN}) runs in the pipeline with database access; it asserts the same bijection over settled matches and halts on any break. Eyeball the kicked-off rows below for team identity and slot assignment.

| M id | batch slot | home | away | kickoff (UTC) | kicked off |
|------|-----------|------|------|---------------|-----------|
| M01 | G-A-1 | MEX (Mexico) | RSA (South Africa) | 2026-06-11T19:00:00+00:00 | yes |
| M02 | G-A-2 | KOR (Korea Republic) | CZE (Czechia) | 2026-06-12T02:00:00+00:00 | yes |
| M03 | G-B-1 | CAN (Canada) | BIH (Bosnia & Herzegovina) | 2026-06-12T19:00:00+00:00 | yes |
| M04 | G-B-2 | QAT (Qatar) | SUI (Switzerland) | 2026-06-13T19:00:00+00:00 | yes |
| M05 | G-C-1 | BRA (Brazil) | MAR (Morocco) | 2026-06-13T22:00:00+00:00 | yes |
| M06 | G-C-2 | HAI (Haiti) | SCO (Scotland) | 2026-06-14T00:00:00+00:00 | yes |
| M07 | G-D-1 | USA (United States) | PAR (Paraguay) | 2026-06-13T01:00:00+00:00 | yes |
| M08 | G-D-2 | AUS (Australia) | TUR (Türkiye) | 2026-06-14T04:00:00+00:00 | yes |
| M09 | G-E-1 | GER (Germany) | CUW (Curaçao) | 2026-06-14T17:00:00+00:00 | yes |
| M10 | G-E-2 | CIV (Côte d'Ivoire) | ECU (Ecuador) | 2026-06-14T23:00:00+00:00 | yes |
| M11 | G-F-1 | NED (Netherlands) | JPN (Japan) | 2026-06-14T20:00:00+00:00 | yes |
| M12 | G-F-2 | SWE (Sweden) | TUN (Tunisia) | 2026-06-15T02:00:00+00:00 | yes |
| M13 | G-G-1 | BEL (Belgium) | EGY (Egypt) | 2026-06-15T19:00:00+00:00 | yes |
| M14 | G-G-2 | IRN (IR Iran) | NZL (New Zealand) | 2026-06-16T01:00:00+00:00 | no |
| M15 | G-H-1 | ESP (Spain) | CPV (Cabo Verde) | 2026-06-15T16:00:00+00:00 | yes |
| M16 | G-H-2 | KSA (Saudi Arabia) | URU (Uruguay) | 2026-06-15T22:00:00+00:00 | yes |
| M17 | G-I-1 | FRA (France) | SEN (Senegal) | 2026-06-16T19:00:00+00:00 | no |
| M18 | G-I-2 | IRQ (Iraq) | NOR (Norway) | 2026-06-16T22:00:00+00:00 | no |
| M19 | G-J-1 | ARG (Argentina) | ALG (Algeria) | 2026-06-17T01:00:00+00:00 | no |
| M20 | G-J-2 | AUT (Austria) | JOR (Jordan) | 2026-06-17T04:00:00+00:00 | no |
| M21 | G-K-1 | POR (Portugal) | COD (Congo DR) | 2026-06-17T17:00:00+00:00 | no |
| M22 | G-K-2 | UZB (Uzbekistan) | COL (Colombia) | 2026-06-17T23:00:00+00:00 | no |
| M23 | G-L-1 | ENG (England) | CRO (Croatia) | 2026-06-17T20:00:00+00:00 | no |
| M24 | G-L-2 | GHA (Ghana) | PAN (Panama) | 2026-06-18T02:00:00+00:00 | no |
| M25 | G-A-3 | MEX (Mexico) | KOR (Korea Republic) | 2026-06-16T19:00:00+00:00 | no |
| M26 | G-A-4 | CZE (Czechia) | RSA (South Africa) | 2026-06-17T02:00:00+00:00 | no |
| M27 | G-B-3 | CAN (Canada) | QAT (Qatar) | 2026-06-17T19:00:00+00:00 | no |
| M28 | G-B-4 | SUI (Switzerland) | BIH (Bosnia & Herzegovina) | 2026-06-18T19:00:00+00:00 | no |
| M29 | G-C-3 | BRA (Brazil) | HAI (Haiti) | 2026-06-18T22:00:00+00:00 | no |
| M30 | G-C-4 | SCO (Scotland) | MAR (Morocco) | 2026-06-19T00:00:00+00:00 | no |
| M31 | G-D-3 | USA (United States) | AUS (Australia) | 2026-06-18T01:00:00+00:00 | no |
| M32 | G-D-4 | TUR (Türkiye) | PAR (Paraguay) | 2026-06-19T04:00:00+00:00 | no |
| M33 | G-E-3 | GER (Germany) | CIV (Côte d'Ivoire) | 2026-06-19T17:00:00+00:00 | no |
| M34 | G-E-4 | ECU (Ecuador) | CUW (Curaçao) | 2026-06-19T23:00:00+00:00 | no |
| M35 | G-F-3 | NED (Netherlands) | SWE (Sweden) | 2026-06-19T20:00:00+00:00 | no |
| M36 | G-F-4 | TUN (Tunisia) | JPN (Japan) | 2026-06-20T02:00:00+00:00 | no |
| M37 | G-G-3 | BEL (Belgium) | IRN (IR Iran) | 2026-06-20T19:00:00+00:00 | no |
| M38 | G-G-4 | NZL (New Zealand) | EGY (Egypt) | 2026-06-21T01:00:00+00:00 | no |
| M39 | G-H-3 | ESP (Spain) | KSA (Saudi Arabia) | 2026-06-20T16:00:00+00:00 | no |
| M40 | G-H-4 | URU (Uruguay) | CPV (Cabo Verde) | 2026-06-20T22:00:00+00:00 | no |
| M41 | G-I-3 | FRA (France) | IRQ (Iraq) | 2026-06-21T19:00:00+00:00 | no |
| M42 | G-I-4 | NOR (Norway) | SEN (Senegal) | 2026-06-21T22:00:00+00:00 | no |
| M43 | G-J-3 | ARG (Argentina) | AUT (Austria) | 2026-06-22T01:00:00+00:00 | no |
| M44 | G-J-4 | JOR (Jordan) | ALG (Algeria) | 2026-06-22T04:00:00+00:00 | no |
| M45 | G-K-3 | POR (Portugal) | UZB (Uzbekistan) | 2026-06-22T17:00:00+00:00 | no |
| M46 | G-K-4 | COD (Congo DR) | COL (Colombia) | 2026-06-22T23:00:00+00:00 | no |
| M47 | G-L-3 | ENG (England) | GHA (Ghana) | 2026-06-22T20:00:00+00:00 | no |
| M48 | G-L-4 | PAN (Panama) | CRO (Croatia) | 2026-06-23T02:00:00+00:00 | no |
| M49 | G-A-5 | MEX (Mexico) | CZE (Czechia) | 2026-06-21T19:00:00+00:00 | no |
| M50 | G-A-6 | RSA (South Africa) | KOR (Korea Republic) | 2026-06-22T02:00:00+00:00 | no |
| M51 | G-B-5 | CAN (Canada) | SUI (Switzerland) | 2026-06-22T19:00:00+00:00 | no |
| M52 | G-B-6 | BIH (Bosnia & Herzegovina) | QAT (Qatar) | 2026-06-23T19:00:00+00:00 | no |
| M53 | G-C-5 | SCO (Scotland) | BRA (Brazil) | 2026-06-23T22:00:00+00:00 | no |
| M54 | G-C-6 | MAR (Morocco) | HAI (Haiti) | 2026-06-24T00:00:00+00:00 | no |
| M55 | G-D-5 | USA (United States) | TUR (Türkiye) | 2026-06-23T01:00:00+00:00 | no |
| M56 | G-D-6 | PAR (Paraguay) | AUS (Australia) | 2026-06-24T04:00:00+00:00 | no |
| M57 | G-E-5 | ECU (Ecuador) | GER (Germany) | 2026-06-24T17:00:00+00:00 | no |
| M58 | G-E-6 | CUW (Curaçao) | CIV (Côte d'Ivoire) | 2026-06-24T23:00:00+00:00 | no |
| M59 | G-F-5 | TUN (Tunisia) | NED (Netherlands) | 2026-06-24T20:00:00+00:00 | no |
| M60 | G-F-6 | JPN (Japan) | SWE (Sweden) | 2026-06-25T02:00:00+00:00 | no |
| M61 | G-G-5 | NZL (New Zealand) | BEL (Belgium) | 2026-06-25T19:00:00+00:00 | no |
| M62 | G-G-6 | EGY (Egypt) | IRN (IR Iran) | 2026-06-26T01:00:00+00:00 | no |
| M63 | G-H-5 | URU (Uruguay) | ESP (Spain) | 2026-06-25T16:00:00+00:00 | no |
| M64 | G-H-6 | CPV (Cabo Verde) | KSA (Saudi Arabia) | 2026-06-25T22:00:00+00:00 | no |
| M65 | G-I-5 | NOR (Norway) | FRA (France) | 2026-06-26T19:00:00+00:00 | no |
| M66 | G-I-6 | SEN (Senegal) | IRQ (Iraq) | 2026-06-26T22:00:00+00:00 | no |
| M67 | G-J-5 | JOR (Jordan) | ARG (Argentina) | 2026-06-27T01:00:00+00:00 | no |
| M68 | G-J-6 | ALG (Algeria) | AUT (Austria) | 2026-06-27T04:00:00+00:00 | no |
| M69 | G-K-5 | COL (Colombia) | POR (Portugal) | 2026-06-27T17:00:00+00:00 | no |
| M70 | G-K-6 | UZB (Uzbekistan) | COD (Congo DR) | 2026-06-27T23:00:00+00:00 | no |
| M71 | G-L-5 | PAN (Panama) | ENG (England) | 2026-06-27T20:00:00+00:00 | no |
| M72 | G-L-6 | CRO (Croatia) | GHA (Ghana) | 2026-06-28T02:00:00+00:00 | no |

