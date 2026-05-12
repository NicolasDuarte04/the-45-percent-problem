# wc2026_fixtures.parquet (sidecar README)

File: `data/raw/wc2026_fixtures.parquet`
Last touched: 2026-05-11 lockdown sprint, Section 1 (team-name normalisation).
README written: 2026-05-11T19:36Z.

## NAMING STANDARDISATION

Prior to this lockdown, `wc2026_fixtures.parquet` used the names that FIFA
publishes for the 2026 tournament (e.g. "United States", "IR Iran",
"Korea Republic", "Türkiye", "Cabo Verde", "Congo DR"). The rest of the
project (`fetch_historical_matches.py`'s `TEAM_NAME_MAP`,
`fifa_rankings.parquet`, `elo_ratings.parquet`, the calibration corpus) uses
the project's canonical short names (e.g. "USA", "Iran", "South Korea",
"Turkey", "Cape Verde", "DR Congo").

The 2026-05-11 data-completeness audit found that this naming divergence
caused 4 of the 48 WC2026 qualifier teams to appear "missing" from
`fifa_rankings.parquet` when they were in fact present under canonical names.

Architect resolution: `TEAM_NAME_MAP` in `ingestion/fetch_historical_matches.py:92`
is the canonical name source (per `CLAUDE.md` "Team name standardisation"
section); `wc2026_fixtures.parquet` is the deviation. The fixtures file is
brought into line, not the other way around.

`TEAM_NAME_MAP` was extended with two new aliases:

```
"Cabo Verde"  ->  "Cape Verde"
"Türkiye"     ->  "Turkey"
```

(Three other Architect-listed aliases, "United States" -> "USA",
"IR Iran" -> "Iran", "Korea Republic" -> "South Korea", were already
present in the map.)

Both `team_home` and `team_away` columns of `wc2026_fixtures.parquet` were
then passed through the updated `TEAM_NAME_MAP`. Six raw names were
normalised; 17 rows of 104 were affected (some rows contain more than one
mapped team).

Normalisation table (raw -> canonical):

```
Cabo Verde       ->  Cape Verde
Congo DR         ->  DR Congo
IR Iran          ->  Iran
Korea Republic   ->  South Korea
Türkiye          ->  Turkey
United States    ->  USA
```

Knockout-stage placeholder slots (`1A`, `2C`, `WM73`, `LM101`, `BEST3-ABCDF`,
etc.) are NOT team names and were intentionally NOT passed through
`TEAM_NAME_MAP`. They remain untouched. A regex guard
(`^(\d[A-L]|WM\d+|LM\d+|BEST3-[A-Z]+)$`) was used during normalisation to
preserve placeholder identity.

## Post-normalisation invariant

After normalisation, the group-stage team set of `wc2026_fixtures.parquet`
is exactly equal to the `team_name` column of `fifa_rankings.parquet`:

  - both contain exactly 48 names
  - the symmetric difference is the empty set
  - every team in the fixtures' group-stage rows has a matching FIFA
    ranking row, and vice versa

This invariant is checked during the rewrite and is a prerequisite for the
M2 strength matrix in Section 2.

## What was not changed

  - Schedule, venues, kickoff times, host countries, neutral-venue flags:
    untouched.
  - Knockout-stage rows: only placeholder identifiers; no team names to
    normalise. Untouched.
  - Match IDs: untouched.

## Schema (unchanged from prior state)

  | column        | dtype                  | notes                                |
  |---------------|------------------------|--------------------------------------|
  | match_id      | string                 | unique per match (e.g. "M01")        |
  | kickoff_utc   | datetime64[ns, UTC]    | UTC kickoff timestamp                |
  | stage         | string                 | "Group Stage", knockouts, etc.       |
  | group         | string                 | "A".."L" for group stage, else NaN   |
  | team_home     | string                 | TEAM_NAME_MAP canonical, OR placeholder |
  | team_away     | string                 | TEAM_NAME_MAP canonical, OR placeholder |
  | venue         | string                 | stadium name                         |
  | city          | string                 | host city                            |
  | country       | string                 | 3-letter ISO host country code       |
  | is_neutral    | bool                   | True for neutral venue               |

Row count after normalisation: 104 (unchanged).
