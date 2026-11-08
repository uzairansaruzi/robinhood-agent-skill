# Periscope dashboard design direction

Date: November 8, 2026. Status: proposed design brief for review; no UI implementation or performance benchmark is claimed.

## User direction

A modern, clean dashboard with straight lines, 90-degree angles, efficient workflows and smooth interactions. Preserve the existing mobile-first SPYBOT platform and its graphite/lime identity where useful. Treat the following visual tokens and layout details as recommendations, not previously approved user choices.

## Visual system

| Element | Proposed specification |
|---|---|
| Geometry | 0px corner radius on panels, buttons, inputs, tabs and menus; rectangular status labels |
| Layout | Aligned CSS grid, 8px spacing base, 16–24px panel padding, 1px dividers |
| Background | Graphite #0B0E11 |
| Panel | #11161C; elevated detail panel #171E26 |
| Text | Primary #EDF2F7; secondary #A8B3C2 |
| Accent | Lime #C7F36B for selection and primary action |
| States | Teal for healthy, amber for caution, red for failure; each includes text/icon |
| Type | Existing system sans-serif stack; tabular numerals for prices and metrics |
| Hierarchy | Strong section titles, restrained metadata; critical status never tiny or low contrast |
| Surfaces | Flat fills and borders; reserve shadow for overlays |
| Motion | 120–180ms opacity/translation transitions; honor reduced-motion preference |

Avoid pill-shaped badges, rounded cards, decorative gauges, gradients, excessive glow, flashing prices or animated backgrounds. Preserve visible keyboard focus. Validate contrast in rendered screens, including secondary text and state labels; colors above are initial tokens, not a completed accessibility audit.

## Screen organization

Desktop: a 216px left navigation rail; a fixed-height header for workspace, SPY/QQQ selection, mode and market clock; a slim service-status row; then a flexible 12-column content grid. Main chart uses eight columns, signal detail four. A full-width research log sits below. Values are placeholders until a provider supplies evidence.

Phone: a single-column stack, readable chart, concise summary and sticky navigation with at most four destinations; additional sections live in a labeled More menu. Use 44px minimum touch targets. Open detailed evidence on its own route or accessible drawer; preserve the user's ticker, filters and scroll position when returning. Dense logs scroll inside their container without causing full-page horizontal overflow.

| View | Primary task | Essential elements |
|---|---|---|
| Overview | Understand system and market state quickly | Chart, latest qualifying signals, feed freshness, mode, blocked reasons |
| Signal inbox | Review evidence efficiently | Timestamp, rationale, invalidation, source detail, expiry, acknowledgement |
| Strategy lab | Compare reproducible stock-price simulations | Ticker/date/rules/sizing/stops/targets/filters, equity, drawdown, expectancy and trade log |
| Rules and risk | Inspect strategy and guardrails | Separate entry, exit, reversal and no-trade rules; proposed/approved versions |
| Data quality | Determine whether results can be trusted | Coverage, gaps, duplicates, actual mode, timestamps, source lineage |
| Connections | Diagnose IBKR and other feeds | Transport/auth/entitlement/freshness states, last observation, recovery action |
| Review | Sign off on a specific version | Assumptions, evidence, open blockers, checklist, reviewer and version hash |

Six-month SPY/QQQ comparisons belong in the strategy lab. Keep stock OHLC simulations separate from options-flow research. Display fees, slippage, same-bar fill handling, dataset cutoff and holdout period next to the result, with details expandable. Draft input edits do not rewrite a prior result: explicit Recompute creates a new identifiable run.

## Efficient and smooth behavior

- Stream normalized updates from the platform using one suitable SSE or WebSocket channel; do not open a broker connection per widget. Choose the transport to fit existing backend authentication and deployment.
- Batch chart updates and update the last bar in place. Historical pagination must not rebuild the full series or reset zoom/crosshair.
- Move backtests off the request/UI thread, show progress and allow cancellation. Snapshot validated inputs before execution; identify results by run ID, dataset and strategy version.
- Use server pagination or virtualization for long trade/event logs. Debounce filter changes and discard stale responses so slow requests cannot overwrite newer selections.
- Use optimistic UI only for reversible preferences, never for feed health, data arrival, simulation completion or delivery acknowledgement.
- Show initial loading, reconnecting, stale, empty and failed states distinctly. Preserve last known values with their timestamp during outages; never silently replace real data with demo data.
- Keep core information visible without hover. Provide keyboard navigation, labeled chart summaries, accessible controls and reduced motion.
- Keep the browser free of IBKR tokens, login passwords and local Gateway addresses. An authenticated application backend supplies read models.

## Performance and acceptance targets

Targets are proposed budgets to measure, not reported performance: immediate local response to filter interactions within 100ms on a representative phone; cached view transitions under 300ms; chart panning near the device's refresh rate under the agreed data volume. Measure remote filter results separately. Separate network delay, provider delay, backend processing and browser render time in measurement.

Review at 390px phone width and 1440px desktop width. Confirm no clipped labels or page overflow, usable loading/error states, keyboard focus, acceptable contrast, preserved chart range on updates and visibly accurate connection/data modes. Test a long event log and replay burst rather than an empty dashboard. Include screenshots and measured results in the eventual UI PR.

## Implementation handoff

Start with the existing `platform/web` and FastAPI contracts. Inventory current components before adding dependencies. Evaluate Lightweight Charts using its official documentation (https://tradingview.github.io/lightweight-charts/) if the current chart cannot meet interaction needs; it supplies charts, not market data. Preserve licensing/attribution requirements.

Deliver in small slices: tokens and navigation, overview/chart, connections, then strategy/review workflows. Coordinate typed read models and health states with the IBKR owner before parallel UI work. A shared screenshot and contract fixture should be the source of truth for review. Record this document as Dakota's requested visual direction plus proposed implementation details; do not describe it as approved production design or completed code.
