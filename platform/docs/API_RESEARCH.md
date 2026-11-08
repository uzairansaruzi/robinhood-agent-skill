# API and MCP implementation reference

Research date: 2026-11-08. Primary provider documentation only; no Reddit. Exa discovery: 55 requested result slots across market-data, OpenAI, infrastructure, GitHub and notifications (includes overlap; not 55 unique verified sources). Relevant pages were fetched to validate the recommendations. Links are a curated implementation reference, not copied complete documentation or proof of account access. Provider docs and plan limits can change.

## Required versus optional

| Integration | Role | Need |
|---|---|---|
| Unusual Whales API | Options flow, net premium, gamma/exposure, economic events | Core to flow/gamma strategies; separate API entitlement |
| Licensed underlying feed | SPY/QQQ quotes and complete bars | Core; UW if validated sufficient, or dedicated Alpaca SIP |
| Pushover | Phone/computer push | Recommended notification transport; app token + recipient key |
| PostgreSQL + server runtime | Continuous operation and durable state | Required for recommended distributed production design |
| GitHub REST / Actions | Source, CI and deployment | Development/operations; not a price feed |
| OpenAI Responses | Evidence explanation / research | Optional, asynchronous |
| Exa API / MCP | Source-backed news and research | Optional, asynchronous |
| TradingView webhook | Additional chart-defined setup triggers | Optional; not a guaranteed transport or historical feed |
| Owned read-only MCP | Let an assistant inspect dashboard state | Optional later; not required to run scans |
| Broker connection | Order placement | Excluded by user scope |

## Unusual Whales

Base: `https://api.unusualwhales.com`; header `Authorization: Bearer <server-side token>`. [Overview](https://api.unusualwhales.com/docs), [complete index](https://api.unusualwhales.com/docs/llms.txt), [conventions](https://api.unusualwhales.com/docs/conventions.md), [errors](https://api.unusualwhales.com/docs/errors.md).

| Operation | Exact REST route | Reference |
|---|---|---|
| Underlying candles | `GET /api/stock/{ticker}/ohlc/{candle_size}` | [OHLC](https://api.unusualwhales.com/docs/api/stock/ohlc.md) |
| Flow alerts | `GET /api/option-trades/flow-alerts` | [Flow alerts](https://api.unusualwhales.com/docs/api/option-trade/flow-alerts.md) |
| Minute net premium | `GET /api/stock/{ticker}/net-prem-ticks` | [Net premium](https://api.unusualwhales.com/docs/api/stock/callput-netvol-ticks.md) |
| Gamma/greek by strike | `GET /api/stock/{ticker}/greek-exposure/strike` | [Exposure](https://api.unusualwhales.com/docs/api/gexgreeks/greek-exposure-by-strike.md) |
| Scheduled events | `GET /api/market/economic-calendar` | [Calendar](https://api.unusualwhales.com/docs/api/market/economic-calendar.md) |

[WebSocket](https://api.unusualwhales.com/docs/websocket): `wss://api.unusualwhales.com/socket?token=…`; real User-Agent, join e.g. `{"channel":"gex_strike:SPY","msg_type":"join"}`. Advanced tier or above. Redact query tokens in logs. The **Periscope channel is index-only**; use supported SPY/QQQ gex/net-flow/options channels for ETF work. Inspect join acknowledgments and heartbeat; resubscribe and reconcile gaps.

Current personal API Basic/Advanced and Whale Bundle Basic/Advanced plans permit three in-flight REST requests across tokens and no per-minute/daily cap; other plans can differ. Use a semaphore and returned error/current_limit rather than obsolete RPM assumptions. A successful response can contain no data. Freshness comes from payload timestamps, not whether bytes changed.

OHLC caps at 2,500 rows; intraday is newest first with a forming current candle. Use date windows, explicit sorting and completed bars. Net-premium ticks are increments, not cumulative daily totals. Flow alert pagination and timestamps must be explicit (`newer_than`, `older_than`, limit); a single response is not a full history. Store first-seen time because OI and some history can restate.

Official starting code: [unusual-whales/api-examples](https://github.com/unusual-whales/api-examples). Adapt scoped stream-to-database examples after inspecting licenses/dependencies; do not import an unreviewed trading bot wholesale. Official assistant MCP: `https://unusualwhales.com/public-api/mcp`; tool authorization and account entitlements remain separate from deployed API credentials.

## Alpaca market data only

[Market data plans/auth](https://docs.alpaca.markets/us/docs/about-market-data-api), [stock bars](https://docs.alpaca.markets/us/reference/stockbars), [historical options](https://docs.alpaca.markets/us/docs/historical-option-data), [stream protocol](https://docs.alpaca.markets/us/docs/streaming-market-data), [option stream](https://docs.alpaca.markets/us/docs/real-time-option-data).

REST base `https://data.alpaca.markets`; headers `APCA-API-KEY-ID`, `APCA-API-SECRET-KEY`. Use only data endpoints, never trading endpoints. Basic stocks are real-time IEX-only and options indicative; the official page currently lists Algo Trader Plus at $99/month with consolidated stocks and OPRA. This is a provider list price, not a verified account entitlement or total budget. A dedicated feed is optional if UW provides validated sufficient price data.

Follow every `next_page_token`; stock bars group by symbol then time, so the first page can omit QQQ. Options history begins February 2024. Option WebSocket uses MessagePack at `wss://stream.data.alpaca.markets/v1beta1/{indicative|opra}`; do not use a JSON-only parser. Centralize subscriptions because connection entitlements can be limited. Record feed type and reject delayed/indicative data where live consolidated confirmation is required.

## TradingView ingress

[Webhook setup](https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/), [HTTPS certificate authentication](https://www.tradingview.com/support/solutions/43000680459-webhook-authentication/). Two-factor authentication required. HTTPS port 443 preferred; only 80/443 accepted, IPv4, request cancelled after three seconds. Validate sender at ingress, limit body size, persist/enqueue, return quickly and do analysis afterward. Reconcile delivery failures. TradingView does not document a GitHub-style HMAC header; do not invent one. Certificate verification must happen at an ingress that can actually inspect and verify the presented client certificate; matching a JSON field or forwarded header is insufficient. This ingress is not implemented in the first slice.

## OpenAI

[Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [tools](https://developers.openai.com/api/docs/guides/tools), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [remote MCP](https://developers.openai.com/api/docs/guides/tools-remote-mcp), [migration/storage notes](https://developers.openai.com/api/docs/guides/migrate-to-responses).

`POST https://api.openai.com/v1/responses`; `Authorization: Bearer <project API key>`. Project API billing is separate from ChatGPT access. Use configurable tested model, strict `text.format` JSON schema, explicit refusal/incomplete/error handling, output-token limit, timeout and budget. `store:false` disables Responses application-state storage; it is not a blanket zero-retention guarantee. AI is for explanation and research; never let model prose supply missing prices or bypass deterministic evidence gates. AI adapter is planned and no model API calls were made for this implementation.

Remote MCP is `tools:[{type:"mcp",server_label,server_url,allowed_tools,...}]`. Restrict to reviewed tools; approve sensitive data sharing. For documentation only: `https://developers.openai.com/mcp`. Streamable HTTP is preferred for a new owned server. Do not assume OAuth credentials from this chat are available to a background service.

## Exa

[Authentication](https://exa.ai/auth.md), [OpenAPI schema](https://exa.ai/docs/exa-spec.yaml), [MCP](https://exa.ai/docs/get-started/exa-mcp). API `https://api.exa.ai/search` and `/contents`; header `x-api-key` or `Authorization: Bearer`. Hosted MCP `https://mcp.exa.ai/mcp`. Public trial search/fetch limits are not a production capacity guarantee. Keep research sources/URLs/timestamps; verify factual market claims against original sources. Cache and budget research separately from quote ingestion. Exa is not a live market feed.

## GitHub

[REST index](https://docs.github.com/en/rest), [versioning](https://docs.github.com/en/rest/about-the-rest-api/api-versions), [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), [webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [failed delivery](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries), [workflow schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [GCP OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform).

Base `https://api.github.com`; Bearer GitHub App installation token preferred for unattended work, fine-grained repo token acceptable for setup. Explicitly choose supported REST version; use JSON media type. Required API families: repository contents, Git trees/commits/refs, pull requests, Actions runs/jobs, commit status/checks. GitHub stores/tests/deploys code; GitHub Pages is static hosting and cannot run this backend or own secrets. Scheduled Actions can be delayed/dropped under load; do not use them as an intraday scanner clock.

Normal authenticated personal REST limit is 5,000 requests/hour; unauthenticated is 60/hour, with separate secondary limits. Obey response headers, Retry-After, pagination and conditional requests. Validate raw-body webhook HMAC-SHA256 (`X-Hub-Signature-256`) with constant-time comparison and deduplicate `X-GitHub-Delivery`. GitHub does not automatically retry failed webhook deliveries.

Official [GitHub MCP](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md): `https://api.githubcopilot.com/mcp/`, OAuth or scoped token. Prefer read-only toolsets for research; development writes are separate from the signal runtime. No GitHub token belongs in the browser or production scanner unless a defined operational task requires it.

## Notifications

[Pushover API](https://pushover.net/api/), [delivery semantics](https://support.pushover.net/i39-notification-storage-and-delivery), [emergency receipts](https://pushover.net/api/receipts).

`POST https://api.pushover.net/1/messages.json`; required form fields `token`, `user`, `message`; optional `title`, `url`, `ttl`, `device`, priority. Register an application and install/authorize phone and desktop clients. Omit device to address registered clients. Use normal priority by default. Accepted API status is not device receipt. Emergency acknowledgement receipts exist for priority 2, which also requires retry/expire, but are unnecessary for ordinary signals. Validate credentials with a deliberately labeled test only after configuration; no notifications were sent during research.

## Hosting and operations docs

- [Cloud Run resource model](https://docs.cloud.google.com/run/docs/resource-model)
- [Worker pools](https://docs.cloud.google.com/run/docs/deploy-worker-pools)
- [WebSocket timeouts](https://docs.cloud.google.com/run/docs/triggering/websockets)
- [Scheduler to Cloud Run](https://docs.cloud.google.com/run/docs/triggering/using-scheduler)
- [Cloud SQL connection](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Cloud Tasks delivery/retries](https://docs.cloud.google.com/tasks/docs/dual-overview)
- [Render background workers](https://render.com/docs/background-workers)
- [Render cron jobs](https://render.com/docs/cronjobs)

Cloud Tasks is at-least-once and gives no precise delivery-time guarantee; signal expiry and idempotency remain application responsibilities. Start with one queue mechanism, not every cloud product. Production credentials, deployment, entitlements, uptime, latency, costs and device receipt remain unverified.
