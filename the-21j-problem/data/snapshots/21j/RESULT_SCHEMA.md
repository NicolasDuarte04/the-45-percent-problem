# `result_official.json` — Stage B / PR-B contract (Session 18)

This file does **not** exist yet, and must not be created with placeholder values.
It is written **only in PR-B**, from a **real, certified Registraduría result**, with
source and timestamp. Until it exists, the website shows the result as pending.

The website reads it via `normalizeResult` in
`website/src/app/voto21junio/_lib/voto-data.ts`. A result is treated as
**available** (and rendered) only when both `cepeda_pct` and `espriella_pct` are
present numbers. If only a provisional boletín exists, set `provisional: true`
and `certified: false`, and wait for certification before the final post-mortem.

## Shape

```json
{
  "certified": true,
  "provisional": false,
  "cepeda_pct": 0.0,
  "espriella_pct": 0.0,
  "leader_name": "Iván Cepeda | Abelardo de la Espriella",
  "source": "Registraduría Nacional del Estado Civil",
  "source_url": "https://resultados.registraduria.gov.co/...",
  "as_of": "2026-06-22T00:00:00-05:00"
}
```

| field           | type    | notes                                                             |
|-----------------|---------|-------------------------------------------------------------------|
| `certified`     | bool    | true only for the official certified count                        |
| `provisional`   | bool    | true for a pre-certification boletín; label it, do not call final |
| `cepeda_pct`    | number  | certified vote share, percent (e.g. 50.4). Required for rendering  |
| `espriella_pct` | number  | certified vote share, percent. Required for rendering             |
| `leader_name`   | string  | the candidate with more votes, by name, neutral. No adjectives    |
| `source`        | string  | the issuing authority                                             |
| `source_url`    | string  | direct link to the official figure                               |
| `as_of`         | string  | ISO-8601 timestamp of the figure                                  |

## What PR-B must also do (not data, code/prose)

1. Result vs model + 80% interval coverage: already implemented and gated in
   `resultado/page.tsx` (the `ResultVsModel` helper states plainly whether the
   model's 80% margin interval contained the certified result). It activates
   automatically once this file is present and certified.
2. The calibration post-mortem prose (the §"Autocrítica de calibración"
   placeholder in `resultado/page.tsx`) must be **written by hand**, self-critically.
   Do not auto-generate it. State the miss (if any) plainly with the mechanism:
   stale pre-silence polls, the thin/coin-flip flag, the under-confidence relative
   to the market. The model said a near-tie, so it does **not** get to claim it
   called the winner.
3. A final honesty review of the post-mortem for spin / overclaiming / side-favouring
   before merge (a verification subagent reading only for neutrality is worth it).

## Hard guardrails (unchanged)

- Never fabricate or pre-fill the result. Real certified data only; provisional
  clearly labelled; source and timestamp on every result figure.
- Candidate-neutral; result reported by name with source; no adjectives.
- No rendered em or en dashes; no affirmative `gana`/`apuesta`/`favorito`/`pronostico`
  framing; honesty labels intact.
