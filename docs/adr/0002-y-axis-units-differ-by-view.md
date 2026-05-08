# Y-axis units differ between live and historical views

## Context

The Graph tab has six time windows. A naive implementation would use the same
Y-axis unit (e.g. Mbps, averaged across the bucket) on all of them. We deliberately
do not.

## Decision

- **5-minute view** — Y-axis = **throughput** (Mbps / KB·s⁻¹). Top label = peak
  speed observed in the visible window.
- **3 h / 24 h / week / month / year** — Y-axis = **bytes transferred per bucket**
  (e.g. MB per 10-minute slot in the week view). Top label = peak bucket usage.
  A separate prominent figure shows total volume for the whole window.

## Why

Users ask different questions at different scales. At 5 minutes the question is
"how fast is my network *right now*?" — a speed question. At week/month/year the
question is "how much did I transfer?" — a volume question. Reporting averaged
Mbps over a 1-hour bucket answers neither well: it understates spikes and is an
awkward unit to think about for usage.

This justifies the [tiered rollup decision](0001-tiered-rollups-in-sqlite.md):
because the historical views are usage visualizations, the spike-smearing
introduced by 1-hour buckets at month/year scale is acceptable. If a future
reader is tempted to "unify" the axis to Mbps everywhere, they should first
revisit whether the historical views are still meant to answer the *usage*
question — if so, this asymmetry is intentional, not a bug.
