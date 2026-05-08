# SapphWire — Domain Context

Glossary of terms and concepts that are meaningful to domain experts.
Not a description of the implementation; for that, read the code.

---

## Views & their purpose

The Graph tab offers six time windows. They split into two semantic groups:

- **Live view (5 minutes)** — *throughput* visualization.
  Answers "how fast is my network going right now?"
  Y-axis is speed (Mbps / KB·s⁻¹). The relevant number at this scale is *peak speed*.

- **Historical views (3 h / 24 h / week / month / year)** — *data usage* visualization.
  Answer "how much did I transfer over this period?"
  Y-axis is bytes-transferred *per bucket* (e.g. MB per 10-minute slot in week view).
  The relevant number at this scale is *total volume*, not peak speed.

This distinction is load-bearing: it justifies why the historical tiers use coarse buckets
(spike fidelity is irrelevant when the user is asking a usage question).

## Storage tiers

Time-series flow data is stored in four tiers in SQLite. Each tier serves specific views;
older tiers are downsampled from newer ones on a background timer and pruned by age.

| Tier   | Bucket | Retention | Serves            |
|--------|--------|-----------|-------------------|
| Live   | 1 s    | ~10 min   | 5-minute view     |
| Short  | 1 min  | 24 h      | 3 h, 24 h views   |
| Medium | 10 min | 30 d      | week view         |
| Long   | 1 h    | 1 year    | month, year views |

Hard retention cap: **1 year**. No flow data older than that is kept.

## Network scope

Every byte of measured traffic is classified by the *remote* IP of the flow:

- **LAN** — remote IP is RFC1918 (`10/8`, `172.16/12`, `192.168/16`),
  link-local (`169.254/16`), or in the same subnet as one of the host's interfaces.
  The flow never leaves the home network.
- **WAN** — remote IP is anything else (public internet).
- **All** — sum of LAN + WAN.

The Usage page exposes a WAN/LAN/All selector inside the *Total bandwidth* card; the
selection scopes every figure on the page (Apps, Hosts, Recent activity, totals).
**Default = All.** Mismatches between an app's reported usage and its "actual"
usage are usually an unintended scope filter — All should always equal the system total.

## Hosts (remote endpoints)

A *host* row in the Usage tab is one row **per remote IP**, labelled with its
PTR (reverse-DNS) name when one resolves and with the raw IP otherwise.
The same hostname may appear multiple times — this is normal CDN behaviour
(many edge IPs share a PTR like `a125.dscr.akamai.net`) and is intentional;
each row is a distinct edge.

PTR resolution is async and cached (TTL ~24 h). Unresolved IPs are not retried
on every render.

## Firewall — Active apps list

The list on the Firewall tab is **persistent and lifetime-ranked**, not "what's
sending traffic right this second." Specifically:

- Default contents: every app that has *ever* sent a byte through SapphWire,
  ranked by **cumulative lifetime bytes** (descending).
- An app falls off the default list after **7 days of no observed traffic**.
- "Show all installed apps" toggle additionally surfaces apps the OS knows about
  even if they've never connected — so users can pre-block apps before first launch.
  These are not subject to the 7-day rule.
- "Installed apps" means user-facing programs (Programs and Features / Start Menu /
  UWP packages). System processes and Windows services are excluded by default —
  blocking those is a footgun.
- Re-sort happens on a slow tick (5–10 s) with rank stability, never per-packet.
  Rows do not jump around as live throughput fluctuates.

Per-row live throughput (up/down speeds) is shown but does not drive ordering.

## Firewall — master toggle

The ON/OFF toggle has **suspend** semantics:

- *Off* → SapphWire-owned Windows Firewall rules are set to `Enabled=False`.
  The user's stored *intent* (which apps they wanted blocked) is preserved.
- *On* → those same rules are flipped back to `Enabled=True`.

Lifecycle:
- On crash → rules **remain in place** (fail-safe; blocks survive).
- On explicit uninstall → rules **are cleaned up**.

## Network name

The "Things" header shows a single network identifier, chosen in priority order:

1. Wi-Fi connected → **SSID** (e.g. `Falcon Boost`).
2. Else Ethernet connected → **Windows connection profile name** (`Home`, `Network 1`, etc.).
3. Else only a VPN/virtual adapter up → **adapter friendly name** with `(VPN)` suffix.
4. Nothing connected → `Disconnected`.
5. Multiple physical interfaces up → pick the one carrying the **default route**.

## Scan (Things)

A scan is driven by four sources: ARP table read, mDNS listen, SSDP listen,
and subnet ping sweep. Only the **subnet sweep** has a determinate end —
the progress bar is `(hosts probed) / (hosts in subnet)`. ARP results land
instantly; mDNS/SSDP responses stream in alongside; passive sources get a
~2 s grace window after the sweep ends to flush late responses.

## Alert lifecycle

Alerts are user-facing convenience records, not compliance records.

- "Clear all" uses **inline confirmation** (button morphs to a 3-second red
  "Confirm" state; second click commits) and **hard-deletes**.
- Clearing zeroes the unread badge in the top nav.
- An alert may carry an associated executable path. The "Open file location"
  action opens Explorer with that path selected; the button is hidden when
  no path is associated and disabled-with-tooltip when the file no longer
  exists on disk.
