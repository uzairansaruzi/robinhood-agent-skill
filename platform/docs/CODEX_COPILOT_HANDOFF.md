# Codex / Copilot continuation brief

Owner request: build an almost fully automated SPYBOT dashboard. **Execution explicitly means sending a qualifying-signal notification to the owner's phone/computer. No brokerage connection or orders.** Continue from branch `feature/spybot-alert-platform`, not from a fresh mockup.

## Read first

1. Repository `AGENTS.md` and `.github/copilot-instructions.md`.
2. `platform/README.md`.
3. `platform/docs/ARCHITECTURE.md` for boundaries/milestones.
4. `platform/docs/API_RESEARCH.md` for official routes, authentication, caveats and sources.
5. `platform/deploy/README.md` for production prerequisites.

## Implemented and checked

- FastAPI private API and responsive graphite/lime dashboard with SPY/QQQ, overview, signal inbox, strategy lab, connections and explicitly synthetic demo.
- Candidate envelope validation: strict evidence, coherent finite levels, aware timestamps, source IDs, stale/future/non-live rejection, pending strategy default.
- Local SQLite outbox with atomic enqueue/claim, deduplication, expiry, bounded retries and uncertain-delivery state.
- Pushover adapter and worker; disabled by default. API acceptance is not device delivery.
- Fourteen unittest checks pass, JavaScript syntax passes, Python compilation passes; independent agent reviewed API/outbox/UI and requested fixes which were applied.
- Browser visual testing was attempted with Playwright default and system Chromium. Default binary was absent; system Chromium aborted before page load with `socket() failed: Operation not permitted` in ProcessSingleton. No browser screenshots or visual-pass claim.
- No live feeds connected, cloud resources provisioned, backtests run, or real push notifications sent. Existing dashboard and legacy skill remain untouched.

Run checks from `platform/`:

```bash
python -m unittest discover -s tests -v
node --check web/app.js
python -m compileall -q server tests
```

## Next implementation slice

Implement a read-only Unusual Whales adapter and replayable collector, with captured fixtures, contract tests and explicit first-seen timestamps. Start SPY/QQQ scoped streams (Advanced entitlement) or approved REST polling; do not assume the Periscope index stream serves ETF tickers. Use current official docs and 3-request concurrency control where applicable, bounded reconnect/backoff, heartbeat/gap detection and completed bars. Keep raw event archive separate from normalized observations. Do not treat configured credentials as verified health.

Then implement PostgreSQL/migrations/transactional outbox and tests for parallel workers/restarts. The current SQLite storage is development/single-host only and must not be deployed to Cloud Run as persistent state.

Follow with actual deterministic strategy evaluation, per-source freshness and feed entitlement checks, validated exchange calendar including early closes, no-chop/event gates, and version-bound owner approval. Current candidate booleans are trusted-producer assertions, not independent evidence verification. All strategy parameters in the owner's sign-off remain proposed/unapproved; do not invent thresholds to activate signals. If the approved rules are unavailable, implement data/replay infrastructure and leave strategy activation blocked.

After those pieces work, add bounded OpenAI Responses/Exa research asynchronously, identity-aware cloud deployment (recommended Cloud Run + worker pool + Cloud SQL + Secret Manager), monitoring and labeled device tests. Use separate credentials for the background app; chat connector access is not a deployment credential.

## Acceptance criteria

- Missing/stale/delayed/conflicting data cannot create a real signal.
- A signal includes strategy version, sources, observation/expiry, reason and invalidation.
- Exit is separate from reversal; no automatic direction flip on a small pullback.
- No duplicate logical outbox entries on source replay; no expired push after recovery.
- Uncertain provider delivery is visible; never claim exactly-once device push.
- Demonstrate fresh data, recovery and delivery with real evidence before describing automation as live.
- Keep secrets out of source/browser/logs; no broker/order API dependencies.
- Preserve existing repository work and make focused, reviewable commits/PRs.

This brief is a handoff, not a production-readiness certification. An assigned issue or opened draft PR does not by itself prove a remote agent started running.
