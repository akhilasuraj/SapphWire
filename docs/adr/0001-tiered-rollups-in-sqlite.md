# Tiered rollups in SQLite for time-series flow data

## Context

Originally we stored every flow as a 1-second sample in SQLite and queried that
table for every Graph window (5 min, 3 h, 24 h, week, month, year). Tab switches
became visibly slow, and the week / month views were impractical to query — they
ended up rendering hard-coded data instead of real history.

## Decision

Stay on SQLite. Store flow data in **four downsampled tiers** rather than one raw
table:

| Tier   | Bucket | Retention | Serves            |
|--------|--------|-----------|-------------------|
| Live   | 1 s    | ~10 min   | 5-min view        |
| Short  | 1 min  | 24 h      | 3 h, 24 h views   |
| Medium | 10 min | 30 d      | week view         |
| Long   | 1 h    | 1 year    | month, year views |

Each tier is built by downsampling the tier above it on a background timer; old
rows in each tier are pruned by age. Hard cap: nothing older than 1 year is kept.

## Why

The performance problem isn't SQLite — it's that we were querying a year of
1-second rows to render a chart that only renders ~720 points. Pre-aggregation
makes every view query a small, bounded number of rows.

We deliberately did **not** switch storage engines. DuckDB / VictoriaMetrics-embedded
were considered and rejected: SQLite handles the rolled-up volumes (a year of
1-hour rows is ~9k rows per series) trivially, and we already depend on it.

Bucket sizes were chosen to roughly match the visual resolution at each zoom
level (≈100–1500 points per chart). At month/year scale we knowingly trade
spike fidelity for cheap storage and fast queries — the historical views are
*data-usage* visualizations, not throughput visualizations
(see [`CONTEXT.md`](../../CONTEXT.md) → Views & their purpose).
