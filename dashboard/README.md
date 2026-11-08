# SPYBOT Dashboard (research-only alpha)

Open `dashboard/index.html` in a browser. This is a static, mobile-responsive dashboard with **no backend, live data feed, broker connection, or trade execution**.

## What works
- SPY/QQQ research selectors and strategy model selectors (configuration only)
- Capital/risk budget calculator
- Client-side CSV import and a simple **underlying-price** opening-range breakout proxy, with explicit limitations
- Data-integrity and strategy gate status display

## CSV input
Headers: `timestamp,open,high,low,close`. Example timestamp: `2026-11-06 09:30:00` in US/Eastern market time. Use intraday OHLC data. A breakout is triggered at the first bar close outside the 09:30–09:45 range; the stop is the opposite range boundary; otherwise exit at last intraday bar. This proxy ignores option premiums, fill quality, bid/ask, fees, volatility, intrabar ambiguity, and market impact. **Do not interpret it as an options backtest or as proof of a profitable strategy.**

## Security
Do not place Robinhood passwords, TOTP seeds, API tokens, session cookies, or brokerage secrets in GitHub or client-side JavaScript. The existing repository README includes legacy credential-based MCP setup instructions; those are **not** required for this dashboard. Any future Robinhood integration should use a separately reviewed, permission-scoped, server-side connection with no order permissions. No trading execution is planned.

## Planned
1. Audit legacy Robinhood skill/scripts/templates for compatibility and credentials before pruning anything.
2. Implement server-side adapters for licensed historical Unusual Whales and market data; never embed secrets in frontend.
3. Build reproducible options backtest with timestamp alignment, survivorship safeguards, option bid/ask, fees, slippage, risk caps and walk-forward validation.
4. Add gamma regime, premium acceleration, separate reversal/exit logic and no-trade/chop filters.
5. Set up GitHub Pages or another static host after review, plus CI tests.

## Repository hygiene
Changes are isolated in `feature/spybot-dashboard`; legacy files remain untouched until reviewed. This avoids deleting potentially useful work or making a security-sensitive credential migration without an audit.
