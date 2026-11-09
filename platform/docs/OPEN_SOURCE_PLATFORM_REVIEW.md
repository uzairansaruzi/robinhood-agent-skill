# Open-source and Hugging Face platform review

Review date: November 8, 2026, America/Los_Angeles.
Purpose: select useful foundations and interaction patterns for Periscope/SPYBOT without disrupting its current repository or IBKR work.

## Recommendation

Use **OpenBB Workspace as the primary workspace/design reference**, **OpenAlgo as an operational-workflow reference**, **TradingView Lightweight Charts as the chart-component candidate**, and **LEAN/NautilusTrader as IBKR lifecycle references**. Keep the existing Python/FastAPI platform and implement a focused Periscope interface with square geometry. These are selective reuse and design recommendations; no third-party product is approved as a drop-in, verified replacement.

OpenBB is the closest complete source-available workspace match among the inspected projects. Its public workspace repository is archived, so a wholesale fork creates an immediate maintenance burden. Its root README says component workflow files are retained for reference and do not execute as-is from the repository root. Its component README also says advanced charts are excluded from default builds and require a separate build flag. Published source does not establish rights to redistribute every vendored chart asset. Lightweight Charts is a separate library and product; evaluate it independently.

Hugging Face is useful for discoverable source, research experiments, and isolated demos. The inspected Intel Space was Sleeping and wolfmanex Space was Paused. Neither constitutes evidence of a currently running production service. HF documentation says Spaces on free hardware sleep when unused, default disk is nonpersistent, and outbound networking is limited to ports 80, 443 and 8080. That does not fit a direct remote TWS socket on its usual port without a different deployment/connectivity design. Keep a permanent IBKR Gateway outside a public demonstration Space.

## Evidence standard

- **Documentation inspected:** README or maintainer architecture/reference read.
- **Source inspected:** at least a named implementation file read, but not a comprehensive audit.
- **Runtime verified:** a clean deployment and meaningful workflow actually exercised. None of the candidates has this status in this research.
- Repository activity, test folders, stars and marketing claims are supporting discovery signals, not proof that a platform works, is secure, or produces profitable strategies.

Repository metadata and selected component documentation were fetched directly through GitHub. Hugging Face file pages were read through web retrieval. No code was copied, installed, executed, or incorporated into the app during this research. No Reddit content was used.

## Comparative shortlist

| Candidate | What is evidenced | Fit for Periscope | Main gap | Decision |
|---|---|---|---|---|
| [OpenBB Workspace](https://github.com/OpenBB-finance/workspace) | React/TS/Vite workspace, FastAPI backend, widget/design-system directories and test tooling documented; Apache-2.0 metadata; archived Oct 1, 2026 | Strongest overall workspace architecture/design reference | Archived snapshot, component notices, chart rights, root CI setup and self-host verification | Primary reference; selective reuse after dependency review |
| [OpenAlgo](https://github.com/marketcalls/openalgo) | Maintainer source/docs describe self-hosted platform, broker workflows and dashboards; AGPL-3.0 metadata; pushed Nov 6, 2026 | Operational state, reconnect experience and automation navigation | Execution-heavy; do not assume IBKR support or copy code under the existing MIT terms | Study workflows; independently implement current-scope equivalents |
| [Intel Stock Trader on HF](https://huggingface.co/spaces/Intel/stocktrader) | README plus `app.py` inspected; Streamlit, Alpaca paper endpoint and broker submission calls; Apache-2.0 declared; Sleeping when inspected | Useful example of a compact research/account UI | Different broker, Streamlit-centric architecture, execution code and unverified runtime | Reference only, not the production base |
| [wolfmanex trading dashboard on HF](https://huggingface.co/spaces/wolfmanex/trading-dashboard/tree/main) | Files expose scanner, journal, risk, schedule and test modules; Paused when inspected | Feature organization resembles scan → review → journal | License not established, runtime not running, no IBKR path verified | Workflow inspiration only; no source reuse yet |
| [Tradiny](https://github.com/tradiny/tradiny) | Charting platform with backend/frontend/MCP directories; license file read; pushed Sep 9, 2026 | Focused chart/alert workspace reference | Custom dual-license text built around AGPL and commercial terms; no verified IBKR integration | Secondary reference; review license before reuse |
| [FinRL-X / FinRL-Trading](https://github.com/AI4Finance-Foundation/FinRL-Trading) | Modular data/strategy/backtest/execution architecture, portfolio-weight interface and Alpaca path documented; Apache-2.0 metadata | Research pipeline and experiment organization | Portfolio allocation focus differs from intraday SPY/QQQ signals; not a ready IBKR dashboard | Optional future research module; not the UI foundation |
| [QuantDash](https://github.com/jakobildstad/quantdash) | FastAPI/React backtester, Plotly analytics, parameter controls and hosted demo links documented | Good small strategy-lab interaction reference | License not established in inspected tree; runtime and fill-model accuracy unverified; yfinance claims require independent checks | Reference only until license and engine review |
| [pihuts Algorithmic Trading Backtester](https://github.com/pihuts/Algorithmic_Trading_Backtester) | Indexed maintainer description: React/TS, FastAPI, charts and strategy comparisons; pushed Apr 10, 2026 | Stack resembles proposed research UI | License missing in metadata; tests and operational behavior not established | Discovery lead, not selected base |
| [NautilusTrader IB adapter](https://nautilustrader.io/docs/latest/integrations/interactive_brokers/) | Typed configurations and data/execution separation, reconnect lifecycle and server compatibility documented | Strong IBKR engineering patterns | Full engine adoption would expand scope and dependencies | Adapter reference |
| [LEAN IB plugin](https://github.com/QuantConnect/Lean.Brokerages.InteractiveBrokers) | Brokerage plugin and dedicated tests documented | Broker lifecycle reference and possible future backtest-engine evaluation | C# engine and deployment differences | Engineering reference |

The fit assessments are engineering judgments, not benchmark scores. Recent push timestamps do not imply an active support commitment. Licensing descriptions identify the observed repository metadata/text, not a legal clearance to combine code. Preserve notices and check dependencies/assets at the exact commit selected for reuse.

## What to mimic and improve

| Area | Reuse the idea | Periscope improvement |
|---|---|---|
| Workspace | OpenBB's domain-organized widgets, layouts and data connectors | Curate a small fixed default layout; avoid a wall of widgets on iPhone |
| Charting | Purpose-built price chart interactions | Linked SPY/QQQ timeframes, persistent zoom, completed-bar markers and source/mode overlays |
| Broker state | Explicit application session versus broker-session distinction in OpenAlgo documentation | Separate transport, authentication, entitlement, freshness and recovery status |
| Strategy testing | QuantDash-style editable inputs plus immediate result inspection | Immutable run IDs, declared cutoff, conservative OHLC fills, benchmark and holdout comparisons |
| Workflow | HF examples' scanner/journal/risk module separation | Signal inbox with evidence, invalidation, expiry and downloadable journal |
| Recovery | NautilusTrader's subscription lifecycle boundary | Preserve subscription intent, suppress stale signals, prove recovery through fixtures and soak tests |
| Research | FinRL-X's modular contracts | Keep deterministic SPYBOT rules independently testable; add ML only as an explicitly evaluated experiment |
| Presentation | Professional workspace information hierarchy | 0px radii, sharp panel grid, thin rules, typography hierarchy, restrained graphite/lime palette |

Do not copy a site's branding, logos, text or proprietary assets. Use independently implemented interaction patterns or code whose license and notices have been reviewed. A complete multi-broker execution platform would add considerable code unrelated to the current research/notification goal.

## Concrete candidate validation before adopting code

1. Select exact commits and inspect licenses/notices, lockfiles, dependencies and bundled assets. Record provenance in a third-party notice file for any reused material.
2. Run an isolated, credential-free deployment with recorded fixtures. Verify advertised setup and root-level CI actually work.
3. Exercise ticker changes, filters, parameter edits, recomputation, trade-log pagination and chart-range preservation. Check 390px and 1440px widths.
4. Review the backtest engine for lookahead, next-bar execution, fees/slippage, gap fills, stop/target ambiguity and terminal positions. Compare a hand-worked tiny dataset before trusting headline metrics.
5. Disable/remove broker write paths in any experimental import. Keep account-connected testing separate and read-only.
6. Measure long-log rendering, chart bursts, cancellation, reconnect and stale data behavior. Record actual results rather than using README performance language.
7. Adopt only the smallest component that materially improves the current repository. Keep existing platform checks and architecture intact.

A “great working platform” remains a candidate until those runtime checks pass. Current outcome: a source-backed shortlist and concrete adaptation plan, not a tested deployment.

## Source index and retrieval limitations

- [OpenBB workspace root README](https://github.com/OpenBB-finance/workspace/blob/main/README.md), [frontend README](https://github.com/OpenBB-finance/workspace/blob/main/terminalpro/README.md), and GitHub repository metadata read. Frontend directory describes React Query, Zustand, Radix and UI/test structure. Chart build caveats were read directly from the component README.
- [OpenAlgo repository](https://github.com/marketcalls/openalgo), [broker workflow documentation](https://github.com/marketcalls/openalgo/blob/main/docs/userguide/06-broker-connection/README.md), and repository metadata. Documentation's reconnect handling is a design reference, not a demonstrated test here.
- [Intel Stock Trader README](https://huggingface.co/spaces/Intel/stocktrader/blob/main/README.md) and [app.py](https://huggingface.co/spaces/Intel/stocktrader/blob/main/app.py) retrieved. Alpaca submission calls are visible in the source; they are excluded from the proposed reuse.
- [wolfmanex file tree](https://huggingface.co/spaces/wolfmanex/trading-dashboard/tree/main) retrieved. Direct README fetch was unavailable; file names alone do not verify implementation quality.
- [Tradiny license](https://github.com/tradiny/tradiny/blob/main/LICENSE.md) read through GitHub; standard LICENSE path does not exist. GitHub's NOASSERTION classification was resolved by reading the actual custom text.
- [FinRL-Trading README](https://github.com/AI4Finance-Foundation/FinRL-Trading/blob/master/README.md), [QuantDash README](https://github.com/jakobildstad/quantdash), and repository trees/metadata inspected as noted above.
- [HF Spaces documentation](https://huggingface.co/docs/hub/spaces-overview) read for sleeping, storage and networking constraints.
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) is the chart-library candidate; it provides no licensed market data feed by itself.

See IBKR_INTEGRATION_RESEARCH.md for the official IBKR API catalogue and DASHBOARD_DESIGN_BRIEF.md for the proposed visual and interaction specification.
