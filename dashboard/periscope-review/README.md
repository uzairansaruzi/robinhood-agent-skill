# Periscope Intelligence Platform: strategy review

A dependency-free research dashboard for SPY and QQQ ETF share-price simulations. No options, broker credentials, or order-execution paths.

## Run locally

Serve the `dist/` directory over HTTP, for example `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000. Module workers require HTTP; opening index.html as a file will not work.

In the Robinhood-agent-skill project, this module belongs at `dashboard/periscope-review/`. It is isolated from the existing dashboard and platform services.

## Structure

- `dist/index.html`, `styles.css`: responsive, straight-edged review interface.
- `dist/engine.mjs`: deterministic OHLC validation, signal rules, fills, sizing, and metrics.
- `dist/worker.mjs`: historical loading, independent instrument/candidate runs, fingerprints, and cost sensitivity.
- `dist/app.mjs`: navigation, editable inputs, charts, notes, imports/exports, and review decisions.
- `dist/validation.json`: evidence from the recorded development validation; not a certification of new imports.
- `tests/`: focused fill/data tests and licensed-snapshot regression checks.
- `data-manifest.json`: hashes, provenance, and row counts for the original private historical snapshot.
- `scripts/fetch_bars.py`: optional authenticated historical downloader. Secrets are read from environment only.

## Historical data

The private hosted Site contains 1-minute consolidated SIP stock OHLC fetched through the connected Alpaca data service on November 8, 2026. Each ticker has 59,670 regular-session bars, April 1 through November 6. The default test window is May 6 through November 6, inclusive: 129 trading sessions per ticker. April is warmup only.

Raw market bars are excluded from this public GitHub module. Confirm provider licensing before copying, sharing, or republishing them. Hash metadata is included for review.

To populate your local copy, use your own licensed data with the optional downloader, or open Data quality and import a CSV for each ticker. Required headers: timestamp,open,high,low,close. Timestamps need an explicit UTC offset or Z. No volume or options fields are used.

The downloader needs an Alpaca market-data entitlement covering the requested feed and dates. Set `APCA_API_KEY_ID` and `APCA_API_SECRET_KEY` in your local environment, then run `python3 scripts/fetch_bars.py`. Never put keys in browser code, CSV files, source, or commits.

If bundled data is missing, the dashboard remains available for CSV import and shows blocked research evidence.

## Strategy and fills

Opening range uses 09:30 through 09:44 ET. ORB requires two consecutive closes beyond the same edge, then enters at the next eligible minute open. Touch & Turn uses the opening-range candle direction; its structural target is 38.2% of range inward and stop 19.1% outward.

Whole-share positions are capped by both risk and available capital including entry commission. Default direction is long-only. Enabling shorts explicitly assumes borrow availability; borrow fees are omitted.

The first 15 minutes cannot trigger an entry. No overnight holds, automatic intraday direction flips, or simultaneous positions within one instrument run. Configurable loss pause, trade-count cap, cooldown, opening-gap filter, ATR filter, cutoff, midday filter, and event-date exclusions apply.

ATR is a simple average of the previous 14 complete daily true ranges. Missing minutes or missing warmup block affected sessions. Validation of complete sessions is an offline integrity precheck, not a claim of live-replicable availability. Stop wins ambiguous same-bar exits. Limit-entry target hits are ignored during the entry minute; stops remain active. Gap stops fill at the adverse open.

Reported maximum drawdown conservatively includes adverse minute extremes; the chart displays daily closing drawdown. Taxes, dividends, market impact, partial fills, queue position, and borrow costs are omitted. SPY and QQQ runs each have separate starting equity; their results are not one combined portfolio.

## Validation

Run `node --test tests/*.test.mjs`. With the recorded historical snapshot present, 16 checks pass. Without licensed bars, the historical suite skips and the six focused mechanics tests run. Historical checks verify session coverage, timing, no overnight holds, cash caps, accounting, event exclusions, and future-data perturbation invariance.

The initial default runs are exploratory and negative for all four ticker/candidate pairs. Do not optimize the same data and call it an untouched holdout. Independent AI code review was completed and material findings corrected; human owner review is still pending.

## Persistence and review

Inputs, narrative notes, and a bounded audit history save locally in the browser. CSV imports stay in tab memory. Export workspace saves inputs, imported bars, run evidence, and any sign-off record in portable JSON. Import workspace recomputes evidence and resets approval.

Sign-off requires a current unmodified run, complete coverage and ATR warmup, at least one trade, the validation report, all eight owner acknowledgments, reviewer name, and review notes. The decision fingerprint covers the run, data hashes, engine version, strategy notes, assumptions, reviewer, and review notes. It is a local review record, not a verified electronic signature or live-trading authorization.

Changing inputs or narrative invalidates approval. Reloading also resets checklist and approval. Export a decision record to preserve it.

## Hosting

The canonical Site uses owner-only access. The full deploy output is buildless static files. Do not commit Site credentials. In this GitHub module, provider-specific Site identity is omitted so it can be maintained independently.

Higgsfield was used for the visual-development workspace. The requested cinematic generated-media layer could not be created because the connected account requires a paid plan; no film or generation capability is claimed. The delivered dashboard uses lightweight transitions and honors reduced motion.
