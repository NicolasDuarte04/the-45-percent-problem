# Burn-Murdoch Press Packet

**Target**: John Burn-Murdoch, Chief Data Reporter, Financial Times
**Send time**: Friday May 8, 2026, 10:00 ET
**Status**: DRAFT, do not send until all three sub-artifacts (email, draft column, chart) are reviewed and the numbers in the column are reconciled with the actual M0-M3 ablation output

The packet is built on the "gift before the ask" protocol. He receives, in this order: a chart, a draft column, a CSV of underlying data. The single ask appears once, in the final paragraph of the email, framed as a citation if useful.

If a number anywhere in this packet is wrong by more than its standard error, do not send. The risk of correcting Burn-Murdoch on a number after he reads it is higher than the cost of a 24-hour delay to verify.

---

## Section 1 — The Email

Use a real email address (not a press@ alias). Send via the founder's primary inbox. Subject line below is final; do not A/B test on a single recipient of this caliber.

### 1.1 Subject

```
Calibration of four pre-registered World Cup models, 2010-2022 hold-out
```

### 1.2 Body

```
John,

Your repeated point in your FT pieces and on Twitter that calibration
matters more than headline accuracy in forecast journalism shaped how we
built our 2026 World Cup framework. The chart attached is the result we
think you would want to see first: reliability of four pre-registered
models on the 2022 World Cup hold-out (n = 64 matches, 192 probability
points across the three-way outcome).

The result, by cross-validated log-loss: M2 (Elo blended with FIFA ranking
points via cross-validated shrinkage) wins at 0.993. M3 (Bayesian macro
prior on the Hoffmann-Ging-Ramasamy variables: GDP, population, climate,
host status, tournament history) second at 1.027. M0 (pure Elo) third at
1.034. M1 (Elo plus exponentially-decayed form) disqualified at 1.081 per
the pre-registered acceptance criteria.

Read together: a richer model wins, but only when shrinkage is doing the
work. The variants that simply layered features (form in M1, macro in M3)
either disqualified or improved on the null by a margin too narrow to
interpret (M3 beat M0 by 0.007 log-loss). The full ablation table is on
page 7 of the working paper.

Site is live at https://45analytics.com. Methodology is locked,
pre-registered on OSF, code on GitHub. Working paper is 15 pages.

Three deliverables for you, no return condition:

1. The calibration chart at publication resolution (PNG + SVG, attached;
   our brand colours are advisory, please rebrand to FT palette)
2. A 250-word draft column you can rewrite, repurpose, or discard
   (attached as draft_column.md, watermarked DRAFT, EDIT FREELY)
3. The underlying CSV (calibration_data_2022_holdout.csv)

If a citation eventually fits a piece you are writing, that is the only
return I would ask. If it does not fit, no follow-up.

Nicolás Duarte
45analytics.com
OSF: [link]
GitHub: [link]
Working paper PDF attached.
Trailer 1 (3 minutes, methodology): [link]
```

### 1.3 Attachments to include in the send

- `calibration_2022_holdout.png` (3000x1875 px, transparent background)
- `calibration_2022_holdout.svg` (vector, FT-rebrandable)
- `calibration_data_2022_holdout.csv` (the binned points underlying the chart, plus the raw probability/outcome pairs, 4 columns x ~600 rows)
- `draft_column.md` (Section 2 below, exported as plain markdown)
- `working_paper.pdf` (the 14-page version, current as of today)

### 1.4 Send-time checklist

- [ ] Attachments total under 10 MB; if not, host the PNG/SVG on the site and link
- [ ] All four numerical claims in the email body match the actual ablation output (the "0.25 SE" margin in particular; if M2's actual margin shifts when re-run today against the locked seed, the email body must update before send)
- [ ] OSF link is the public OSF URL, not the private draft URL
- [ ] GitHub link goes to the repo, not to a specific file
- [ ] Trailer 1 link is unlisted YouTube or Vimeo with no autoplay
- [ ] No tracking pixel, no link shortener, no UTM parameters anywhere in the email. Burn-Murdoch will notice and it will read as marketing
- [ ] Send between 10:00 and 10:30 ET (his FT working hours, which are GMT-shifted; he tends to read mid-morning UK time, mid-afternoon UK)

---

## Section 2 — The Draft Column

Tone target: clean, methodology-forward, ends on implication. This is written so that he could publish it close to verbatim if he wants, but more importantly so that even if he rewrites every sentence he keeps the structure: pre-registration as the lede, ablation as the middle, calibration claim as the close.

The 250-word target is the FT data-desk column length. Do not exceed.

### File: `draft_column.md`

```markdown
# DRAFT, EDIT FREELY

## When shrinkage beats both naïve Elo and macro priors: a pre-registered World Cup ablation

A team at 45 Analytics has published its full 2026 World Cup forecasting
framework, locked and pre-registered on OSF before any 2026 match was
played. The pre-registration matters because it removes the temptation to
pick, after the fact, the variant of a model that ended up looking best.

The setup compares four candidates on the 2022 World Cup hold-out: M0
(pure Elo), M1 (Elo plus exponentially-decayed recent form), M2 (Elo
blended with FIFA ranking points via cross-validated shrinkage), and M3 (a
Bayesian macro prior on the Hoffmann-Ging-Ramasamy variables: GDP per
capita, population, climate, host status, tournament history).

By cross-validated log-loss: M2 wins at 0.993. M3 second at 1.027. M0
third at 1.034. M1 disqualified at 1.081 per the pre-registered acceptance
criteria. A richer model wins, but only when the added structure is
disciplined by shrinkage. The variants that simply layered features (form
in M1, macro in M3) either disqualified or improved on the null by a
margin too narrow to interpret (M3 beat M0 by 0.007 log-loss).

This is not an argument that form, ranking, or macroeconomics are
irrelevant to who wins a World Cup. It is that with roughly 200
calibration matches across three prior tournaments, the bias-variance
bargain pays out only when added signal is shrunk toward a strong prior,
here Elo itself. M2's win is a methodological win for shrinkage estimators
in small-sample sports forecasting.

The team's framing is more honest than most: 45 Analytics calls its site a
probabilistic pricing layer, not a prediction tool, and publishes its full
reliability diagram. The 2026 cycle starts in five weeks. We should ask
the same of every World Cup model we cite this summer.

[~ 260 words]

Source: 45analytics.com. OSF pre-registration: [link]. GitHub: [link].
Calibration data: attached CSV. Working paper: attached PDF.
```

### 2.1 Numbers to verify before send

The four log-loss values are now locked from the actual ablation output:

- M0 = 1.034330
- M1 = 1.081097 (DISQUALIFIED)
- M2 = 0.993370 (CHAMPION)
- M3 = 1.026943

Round-to-three-decimals matches the draft column wording (M2 = 0.993, M3 = 1.027, M0 = 1.034, M1 = 1.081). Before send, confirm:

- The four-decimal log-loss values in `data/calibration/` reconcile exactly with the rounded values in the email and column. If any rounding produces a different third decimal, edit
- "M3 beat M0 by 0.007 log-loss" — verify (1.034330 − 1.026943 = 0.007387, rounds to 0.007)
- "Roughly 200 calibration matches across three prior tournaments" — confirm against the row count in `data/raw/historical_matches.parquet` filtered to `is_holdout=False` on WC windows
- The disqualification reason for M1 is "per the pre-registered acceptance criteria" rather than a specific named reason. If the operator wants to be more specific (e.g., "for failing the M0-beating threshold"), the working paper's M1 disqualification note is the source of truth and the email body should match it

If any number is uncertain, replace the specific number with "[verify]" in the working draft and do not send the file until reconciled.

### 2.2 Tone notes (for last-pass editing)

- No exclamation marks anywhere
- No first-person ("we found," "our analysis shows"). The draft is written as if Burn-Murdoch is reporting on us; he is not advertising us
- No promotional language ("revolutionary," "first-of-its-kind," "groundbreaking"). The tone is matter-of-fact reporting
- The closing sentence is an implication, not a sales pitch. Keep it that way
- If the draft starts feeling like marketing copy, delete the relevant paragraph and rewrite

---

## Section 3 — The Chart Spec

Single chart. One job: show that M0 to M3 calibrate well or poorly on the 2022 hold-out, and let the viewer compare them at a glance. Burn-Murdoch will rebrand for FT; ours is publication-ready in our brand.

### 3.1 Chart type

Reliability diagram (calibration plot). Predicted probability on x-axis, empirical frequency on y-axis, perfect-calibration diagonal as reference, four model curves overlaid.

### 3.2 Data source

- Dataset: `data/raw/historical_matches.parquet` filtered to `is_holdout=True` (2022 WC matches only, n=64). Then for each match, each model produces a probability vector over (home win, draw, away win), giving 64 x 3 = 192 probability points
- All four model variants run on the same matches with the locked seed
- Probabilities binned into 10 equal-width bins of width 0.1 on (0, 1)
- For each bin, compute (a) mean predicted probability within the bin, (b) empirical frequency of the corresponding outcome occurring in that bin, (c) bin count

### 3.3 Visual layout

Single panel, 16:9 ratio, 1920 x 1080 px on screen, 3000 x 1875 px on export.

X-axis: *Predicted probability*, range [0, 1], 10 ticks at 0.0, 0.1, ..., 1.0
Y-axis: *Empirical frequency*, range [0, 1], 10 ticks at 0.0, 0.1, ..., 1.0
Aspect ratio inside plot area: 1:1 (square plot region inside the 16:9 canvas; left and right sides reserved for annotations and direct labels)

Reference line: y = x diagonal, 1px solid, mid-grey (#666666 or our equivalent)

Four model curves:
- M0 (pure Elo): solid line, terminal green (`#00FF66` or our locked brand value), 2px
- M1 (+ form): dashed line, terminal amber (`#FFAA00`), 2px
- M2 (+ FIFA): dotted line, pale green (`#88FFB0`), 2px
- M3 (+ macro): dash-dot line, off-white (`#EEEEEE`), 2px

Markers at each bin centroid:
- Filled circle, marker size proportional to log10(bin_count). A bin with 60 points should be roughly 3x the marker area of a bin with 6 points. This is the bin-population signal; without it the chart misleads on under-populated bins

Direct labels (no legend):
- At the right edge of the plot, level with the rightmost data point of each curve, write *M0*, *M1*, *M2*, *M3* in monospace 14pt, color-matched to the curve
- A legend in a corner box is rejected; direct labels read faster

### 3.4 Annotations

Upper-left annotation block, monospace 12pt, left-aligned:
```
Log-loss (lower is better):
M2 = 0.993  (CHAMPION)
M3 = 1.027
M0 = 1.034
M1 = 1.081  (DISQUALIFIED)

Pre-registered M★ selection: M2.
n = 64 matches, 192 probability points, 2022 World Cup hold-out.
```

Lower-right annotation, monospace 10pt:
```
Source: 45analytics.com
OSF: [short link]
GitHub: [short link]
Snapshot SHA: [16 chars]
```

The snapshot SHA is non-negotiable. It signals reproducibility and is the single visual cue that distinguishes this chart from a thousand other forecast charts on Twitter.

### 3.5 Typography and palette

- Font: monospace throughout (JetBrains Mono, IBM Plex Mono, or whichever is locked in the site's CSS). No serif, no sans-serif body
- Background: pure black (`#000000`). Plot background: pure black. Gridlines: very dark grey (`#1A1A1A`), 1px, solid, no major/minor distinction
- Axis labels: off-white (`#EEEEEE`), 12pt
- Title: 18pt, off-white, top-center

Title text: *M0 to M3 calibration on 2022 World Cup hold-out*
Subtitle (14pt, mid-grey, just below title): *Predicted probability vs. realised frequency. Pre-registered ablation.*

### 3.6 Export

Three files, all from the same render:
- `calibration_2022_holdout.png` — 3000x1875, transparent background variant also exported as `_transparent.png`
- `calibration_2022_holdout.svg` — vector, all text as text (not converted to paths) so FT can rebrand fonts
- `calibration_data_2022_holdout.csv` — 4 columns: `model_id`, `bin_lower`, `bin_upper`, `n`, `mean_predicted`, `empirical_frequency`. 40 rows total (10 bins x 4 models)

Save all three to `press_packets/burn_murdoch/` in the repo. Add a README in that directory listing the snapshot SHA, the ablation run timestamp, and the responsible commit.

### 3.7 Implementation hint

If using matplotlib (likely given the existing stack):

```python
import matplotlib.pyplot as plt
import matplotlib as mpl

mpl.rcParams.update({
    'font.family': 'monospace',
    'font.size': 12,
    'axes.facecolor': '#000000',
    'figure.facecolor': '#000000',
    'axes.edgecolor': '#666666',
    'axes.labelcolor': '#EEEEEE',
    'xtick.color': '#EEEEEE',
    'ytick.color': '#EEEEEE',
    'grid.color': '#1A1A1A',
    'grid.linewidth': 1,
    'savefig.dpi': 200,
    'savefig.facecolor': '#000000',
})

fig, ax = plt.subplots(figsize=(16, 9))
ax.set_aspect('equal', adjustable='box')
ax.plot([0, 1], [0, 1], color='#666666', linewidth=1, zorder=1)

# loop over models, plot lines and markers, set direct labels
# ...

ax.set_xlim(0, 1); ax.set_ylim(0, 1)
ax.set_xlabel('Predicted probability')
ax.set_ylabel('Empirical frequency')
ax.set_title('M0 to M3 calibration on 2022 World Cup hold-out',
             color='#EEEEEE', fontsize=18, pad=20)

plt.savefig('calibration_2022_holdout.png',
            bbox_inches='tight', transparent=False)
plt.savefig('calibration_2022_holdout.svg',
            bbox_inches='tight', transparent=False)
```

The aspect ratio constraint (`set_aspect('equal')`) is essential. A calibration plot rendered with non-equal axes is misleading and an FT chart editor will spot it immediately.

### 3.8 Acceptance criteria for the chart

Before the chart leaves the directory, it must clear all of these:

- [ ] Equal aspect ratio in plot area, square inside the canvas
- [ ] Diagonal reference line clearly visible, slightly behind the model curves in z-order
- [ ] All 4 model curves distinguishable at thumbnail size (test by viewing at 200px wide)
- [ ] Bin-count markers visible and proportional
- [ ] Direct labels readable, no overlap
- [ ] Log-loss values in the annotation block match the working paper exactly
- [ ] Snapshot SHA in the lower-right
- [ ] No accidental gridline at x=0 or y=0 that obscures the corner
- [ ] No font fallback (the export does not silently swap your monospace for a default)
- [ ] CSV opens cleanly in Excel and a text editor; no encoding issues

---

## Section 4 — Failure Modes

If Burn-Murdoch does not respond:

- One follow-up email Wednesday May 13, single line: "Following up; happy to share more if useful, no expectation otherwise."
- After that, no further direct contact. We tag him in the calibration challenge tweet on Sunday May 10 (this happens whether or not he replied to the email)
- The chart goes to Silver, Levine, and Karun anyway in their respective packets. The lead exclusive to him expires Tuesday May 12. If he hasn't engaged by then, the chart can be used in the /r/dataisbeautiful organic post on May 21 without conflict

If Burn-Murdoch responds with a clarifying question:

- Same-day reply, fully answered. No more pitching. He is now in a conversation; do not push the column draft, the trailer, or any other artifact unless he asks
- If he asks for additional data, deliver inside 24 hours

If Burn-Murdoch asks to publish:

- Yes, immediately. No conditions, no embargo timing games, no co-author asks
- We provide whatever else he needs (additional charts, source data, methodology one-pagers, a quote)
- Once a piece runs, we do not amplify it from the institutional account on the same day; we wait 24 hours so the placement reads as his story, not ours

If Burn-Murdoch publishes and gets a number wrong:

- Email him privately, factually, no public correction. Provide the right number and the source. Trust him to handle it. Do not tweet about it

---

## Section 5 — File Manifest

This packet, when complete, is:

```
press_packets/burn_murdoch/
├── README.md                            (snapshot SHA, ablation timestamp, send log)
├── email.md                             (Section 1 above, copy-pasteable)
├── draft_column.md                      (Section 2 above, watermarked)
├── calibration_2022_holdout.png         (3000x1875)
├── calibration_2022_holdout_transparent.png
├── calibration_2022_holdout.svg         (vector, rebrandable)
├── calibration_data_2022_holdout.csv    (40 rows, binned)
└── working_paper.pdf                    (current 14-page version)
```

When the packet is complete and the numbers are reconciled, the email goes out at 10:00 ET on Friday May 8.

---

## Final Operational Note

The single most expensive failure mode in this packet is sending it before the numbers are right. The second most expensive is sending it with a tracking pixel. The third is sending it with a follow-up scheduled before he has had time to read it. Avoid all three.

Hit send when the chart is on disk, the column is reconciled, and the day is Friday morning.
