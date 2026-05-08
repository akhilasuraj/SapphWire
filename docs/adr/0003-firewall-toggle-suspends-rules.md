# Firewall master toggle suspends rules instead of deleting them

## Context

The Firewall tab has a master ON/OFF toggle. When the user flips it off, we have
to choose what happens to the Windows Firewall rules SapphWire created on their
behalf.

## Decision

**Suspend semantics.** Toggling off sets every SapphWire-owned rule to
`Enabled=False` in Windows Firewall; toggling on sets them back to `Enabled=True`.
The user's stored *intent* (which apps they wanted blocked) is preserved across
the toggle.

Lifecycle rules:
- On crash → SapphWire-owned rules **remain in place**. Blocks survive.
- On explicit uninstall → rules **are cleaned up**.

## Why

The "off duty" mental model is that *enforcement is paused*, not that *the block
list is gone*. Toggling off and back on must restore the exact prior state with
zero user re-work.

Rejected alternatives:

- **Delete on off, recreate on on.** Same UX outcome but slower, and there is a
  window during recreation where a previously-blocked app could send traffic. No
  upside.
- **Off only stops new enforcement; existing rules stay enforced.** Confusing —
  flipping a switch labelled "Firewall: OFF" while traffic is still being blocked
  is a UX trap.

The crash-vs-uninstall split is deliberate: a crash is unintended, so the safe
default is "your security posture survives." An uninstall is intended, so leaving
behind orphan firewall rules the user can no longer manage from SapphWire would
be hostile.
