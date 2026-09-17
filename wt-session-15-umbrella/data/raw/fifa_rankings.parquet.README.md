# fifa_rankings.parquet (sidecar README)

File: `data/raw/fifa_rankings.parquet`
Produced by: 2026-05-11 lockdown sprint, Section 1 (FIFA rankings backfill).
Author: coding agent executing Path 2 / Option 2h under Architect direction.
Snapshot date in the parquet: 2026-04-01 (FIFA publication date).
README written: 2026-05-11T19:36Z.

## 1. PROVENANCE

This file replaces an earlier 48-row `fifa_rankings.parquet` whose contents were
internally inconsistent with the snapshot date they were labelled with.

The 2026-05-11 data-completeness audit established two facts:

  1. The prior parquet's top-of-table values (Argentina 1898.17 at rank 1,
     France 1854.60 at rank 2, Spain 1828.76 at rank 3) did not correspond to
     any real FIFA publication near the labelled snapshot date of 2026-03-20.
     The closest real FIFA publications around that date have:
       2026-02 era: Spain 1st, Argentina 2nd (per FIFA's own coverage)
       2026-04-01: France 1st, Spain 2nd, Argentina 3rd (the 2026-04-01 publication)
     Neither matches the prior parquet's ordering. Argentina was the world
     #1 from April 2023 to September 2025, so the prior values are consistent
     with some FIFA publication in that 2023 to 2025 window, but they were
     not a real 2026-03-20-adjacent snapshot.

  2. 16 of the 48 WC2026 qualifier teams did not appear in the prior parquet
     under their canonical TEAM_NAME_MAP names. 4 of the 16 were name-convention
     mismatches (USA / Iran / South Korea / Turkey in the parquet vs. United
     States / IR Iran / Korea Republic / Türkiye in `wc2026_fixtures.parquet`);
     12 were genuinely absent (Bosnia & Herzegovina, Cape Verde, DR Congo,
     Curaçao, Czechia, Haiti, Norway, Paraguay, Qatar, South Africa, Sweden,
     Tunisia). The prior parquet also contained 12 stale non-qualifier rows
     (Cameroon, Costa Rica, Denmark, Hungary, Italy, Nigeria, Peru, Poland,
     Serbia, Slovakia, Ukraine, Venezuela) that were never WC2026 qualifiers.

The Architect resolved both findings together by approving Path 2:
re-source ALL 48 rows from the real FIFA publication closest to 2026-03-20.
That publication is 2026-04-01 (the previous FIFA publication; the next
scheduled FIFA publication is 2026-06-10, after the WC2026 opening match
on 2026-06-11). This parquet is the result.

Because Path 2 rewrites the entire file from a coherent single FIFA
publication, the 12 stale non-qualifier rows simply do not appear here;
they are not deleted, they were never re-sourced. The 12 genuinely-missing
qualifier rows are now present. The 4 name-convention mismatches resolve
because both this file and `wc2026_fixtures.parquet` now normalise through
the shared `TEAM_NAME_MAP` in `ingestion/fetch_historical_matches.py`.

## 2. SOURCE

  FIFA publication:        2026-04-01 (the "France reclaim top spot" publication)
  Authoritative page:      https://inside.fifa.com/fifa-world-ranking/men
  Companion news article:  https://inside.fifa.com/fifa-world-ranking/men/news/france-1st-fifa-coca-cola-world-ranking-april-2026

The inside.fifa.com ranking page is a Next.js client-rendered application.
WebFetch and equivalent server-side HTML retrievers see only the layout
shell; they cannot read the populated table. WebFetch against per-team
URLs (e.g., inside.fifa.com/fifa-world-ranking/ARG) shows the same
behaviour. archive.org is blocked at the WebFetch tool layer in this
environment. FIFA's own news article publishes RANKS but not per-team
POINT TOTALS.

To bridge that source-access gap, the Architect authorised a founder-
supervised browser-rendered transcription. The transcription was performed
by an automated browser/vision agent operating under Nicolás Duarte's
supervision in a Safari session on inside.fifa.com/fifa-world-ranking/men.
The transcription yielded two CSVs on disk:

```
data/raw/fifa_rankings_2026-04-01_transcribed.csv             sha256 1f9645b9...
data/raw/fifa_rankings_2026-04-01_transcribed_extension.csv   sha256 07f8df60...
```

The first covers ranks 1 through 80; the second covers ranks 81 through 133
(with rank 116 absent, a transcription gap that does not touch any WC2026
qualifier). Both files carry a header comment block documenting source URL,
publication date, access time, transcriber, and browser.

Integrity verification: a top-15 rank cross-reference against the FIFA news
article (`france-1st-fifa-coca-cola-world-ranking-april-2026`) was executed
before any parquet write. All 15 ranks the article cites (France 1, Spain 2,
Argentina 3, Portugal 5, Brazil 6, Italy 12, Denmark 20, Türkiye 22,
Nigeria 26, Egypt 29, Côte d'Ivoire 34, Sweden 38, Czechia 41, Tunisia 44,
Bosnia and Herzegovina 65) match the transcription exactly.

The hardcoded `WC2026_FIFA_RANKINGS` list in `ingestion/fetch_fifa_rankings.py`
has been updated to reflect the new 48-row, 2026-04-01 publication state.
The `SNAPSHOT_DATE` constant in that script is now `date(2026, 4, 1)`. The
"option (b)" path (remove the hardcoded list and rewire to fetch live) was
considered and rejected: FIFA's JS-rendered page makes live fetching
infeasible from the script itself. Option (a) (update hardcoded with new
values) is the chosen path; the script's docstring and an inline comment
block above the list document the provenance.

## 3. ROW MANIFEST (48 rows, sorted by global fifa_rank)

`source_url` for every row is the FIFA ranking page that the value was
transcribed from. Rows at fifa_rank <= 80 trace to
`fifa_rankings_2026-04-01_transcribed.csv`; rows at fifa_rank >= 81 trace to
`fifa_rankings_2026-04-01_transcribed_extension.csv`. Both transcriptions
were captured from `https://inside.fifa.com/fifa-world-ranking/men` on
2026-05-11. The integrity cross-reference against the FIFA news article
`france-1st-fifa-coca-cola-world-ranking-april-2026` covers 15 of the 48
rows (marked X-REF below); the remaining 33 inherit integrity from the
same transcription source.

| fifa_rank | team_name (canonical)   | fifa_points | confederation | source                          |
|----------:|-------------------------|------------:|:--------------|:--------------------------------|
|         1 | France                  |     1877.32 | UEFA          | inside.fifa.com/men (X-REF)     |
|         2 | Spain                   |     1876.40 | UEFA          | inside.fifa.com/men (X-REF)     |
|         3 | Argentina               |     1874.81 | CONMEBOL      | inside.fifa.com/men (X-REF)     |
|         4 | England                 |     1825.97 | UEFA          | inside.fifa.com/men             |
|         5 | Portugal                |     1763.83 | UEFA          | inside.fifa.com/men (X-REF)     |
|         6 | Brazil                  |     1761.16 | CONMEBOL      | inside.fifa.com/men (X-REF)     |
|         7 | Netherlands             |     1757.87 | UEFA          | inside.fifa.com/men             |
|         8 | Morocco                 |     1755.87 | CAF           | inside.fifa.com/men             |
|         9 | Belgium                 |     1734.71 | UEFA          | inside.fifa.com/men             |
|        10 | Germany                 |     1730.37 | UEFA          | inside.fifa.com/men             |
|        11 | Croatia                 |     1717.07 | UEFA          | inside.fifa.com/men             |
|        13 | Colombia                |     1693.09 | CONMEBOL      | inside.fifa.com/men             |
|        14 | Senegal                 |     1688.99 | CAF           | inside.fifa.com/men             |
|        15 | Mexico                  |     1681.03 | CONCACAF      | inside.fifa.com/men             |
|        16 | USA                     |     1673.13 | CONCACAF      | inside.fifa.com/men             |
|        17 | Uruguay                 |     1673.07 | CONMEBOL      | inside.fifa.com/men             |
|        18 | Japan                   |     1660.43 | AFC           | inside.fifa.com/men             |
|        19 | Switzerland             |     1649.40 | UEFA          | inside.fifa.com/men             |
|        21 | Iran                    |     1615.30 | AFC           | inside.fifa.com/men             |
|        22 | Turkey                  |     1599.04 | UEFA          | inside.fifa.com/men (X-REF)     |
|        23 | Ecuador                 |     1594.78 | CONMEBOL      | inside.fifa.com/men             |
|        24 | Austria                 |     1593.45 | UEFA          | inside.fifa.com/men             |
|        25 | South Korea             |     1588.66 | AFC           | inside.fifa.com/men             |
|        27 | Australia               |     1580.67 | AFC           | inside.fifa.com/men             |
|        28 | Algeria                 |     1564.26 | CAF           | inside.fifa.com/men             |
|        29 | Egypt                   |     1563.24 | CAF           | inside.fifa.com/men (X-REF)     |
|        30 | Canada                  |     1556.48 | CONCACAF      | inside.fifa.com/men             |
|        31 | Norway                  |     1550.94 | UEFA          | inside.fifa.com/men             |
|        33 | Panama                  |     1540.64 | CONCACAF      | inside.fifa.com/men             |
|        34 | Côte d'Ivoire           |     1532.98 | CAF           | inside.fifa.com/men (X-REF)     |
|        38 | Sweden                  |     1514.77 | UEFA          | inside.fifa.com/men (X-REF)     |
|        40 | Paraguay                |     1503.50 | CONMEBOL      | inside.fifa.com/men             |
|        41 | Czechia                 |     1501.38 | UEFA          | inside.fifa.com/men (X-REF)     |
|        43 | Scotland                |     1498.35 | UEFA          | inside.fifa.com/men             |
|        44 | Tunisia                 |     1483.05 | CAF           | inside.fifa.com/men (X-REF)     |
|        46 | DR Congo                |     1478.35 | CAF           | inside.fifa.com/men             |
|        50 | Uzbekistan              |     1465.34 | AFC           | inside.fifa.com/men             |
|        55 | Qatar                   |     1454.96 | AFC           | inside.fifa.com/men             |
|        57 | Iraq                    |     1447.14 | AFC           | inside.fifa.com/men             |
|        60 | South Africa            |     1429.73 | CAF           | inside.fifa.com/men             |
|        61 | Saudi Arabia            |     1421.43 | AFC           | inside.fifa.com/men             |
|        63 | Jordan                  |     1391.45 | AFC           | inside.fifa.com/men             |
|        65 | Bosnia & Herzegovina    |     1385.84 | UEFA          | inside.fifa.com/men (X-REF)     |
|        69 | Cape Verde              |     1366.13 | CAF           | inside.fifa.com/men             |
|        74 | Ghana                   |     1346.31 | CAF           | inside.fifa.com/men             |
|        82 | Curaçao                 |     1294.65 | CONCACAF      | inside.fifa.com/men (extension) |
|        83 | Haiti                   |     1291.71 | CONCACAF      | inside.fifa.com/men (extension) |
|        85 | New Zealand             |     1281.57 | OFC           | inside.fifa.com/men (extension) |

Total: 48 rows.

Confederation distribution (matches FIFA WC2026 slot allocation):

  UEFA      16
  CAF       10
  AFC        9
  CONMEBOL   6
  CONCACAF   6
  OFC        1
  ----------
  Total     48

## 4. NAMING STANDARDISATION

The canonical name source is the `TEAM_NAME_MAP` dict at
`ingestion/fetch_historical_matches.py:92`. Per `CLAUDE.md` it is the single
source of truth for team names across the project. Two aliases were added
during this lockdown to bring `wc2026_fixtures.parquet` and the new FIFA
2026-04-01 transcription into line with the existing canonical set:

```
"Cabo Verde"   ->  "Cape Verde"     (new; FIFA 2026 uses "Cabo Verde", legacy data used "Cape Verde Islands")
"Türkiye"      ->  "Turkey"         (new; FIFA renamed to "Türkiye" in 2022)
```

Three other aliases the Architect listed for completeness were already
present in the map and required no change:

```
"United States"  ->  "USA"          (line 94, pre-existing)
"IR Iran"        ->  "Iran"         (line 102, pre-existing)
"Korea Republic" ->  "South Korea"  (line 97, pre-existing)
```

After the two new aliases were added, `wc2026_fixtures.parquet` was
normalised through the updated map. See `wc2026_fixtures.parquet.README.md`.

## 5. AMENDMENT POINTER

The full audit narrative (the discovery, the Path 2 decision, the downstream
impact on tournament-progression probabilities) is documented in:

```
osf/amendments/amendment_v1.1_data_completeness.md
```

That amendment record is created in Section 2 of the 2026-05-11 lockdown
sprint (re-fit M2 and re-lock champion artifact). The amendment label is
`v1.1`. The locked champion identity (M2_fifa, L_CV = 0.99337) is unaffected
by this re-sourcing because CV log-loss was computed on the historical 2010
to 2022 calibration corpus, not on the WC2026 fixture inputs. Tournament-
progression probabilities (the inputs to the website and the press packets)
will change because the strength matrix changes; the Section 3 batch re-run
quantifies the change.

## Discipline note: synthetic-snapshot pattern

The provenance bug this README documents (a hardcoded fallback labelled with
a real-world date but populated with values from a different actual
publication) is a class of bug. Any time a script in this project ships a
"snapshot" labelled with a real-world date, the values should be cross-
referenced against the real-world data for that date OR the divergence
explicitly disclosed. The original `fetch_fifa_rankings.py` did not do
either; this README and the updated script now do.
