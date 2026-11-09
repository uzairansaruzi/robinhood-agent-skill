# SPYBOT interface

A dependency-free responsive frontend served by the platform API. Default state shows missing inputs and an empty signal inbox. The optional **Preview demo** button uses labeled synthetic data entirely within the browser; it cannot send notifications.

- `GET /api/status`: status object with `automation`, `strategy_status`, and `providers` (`name`, `status`).
- `GET /api/signals`: signal array, or an object with a `signals` array.
- Both calls attach a dashboard Bearer token stored only in tab-scoped session storage when supplied under **Connections**. Provider credentials never belong here.
- Signal records can contain `symbol`, `strategy`, `direction`, `evidence`, `invalidation`, `observed_at`, and `delivery_status`. Visible timestamps use Eastern Time.
- Provider connectivity is displayed from the server. Notification delivery is never inferred from the presence of credentials.

The market-radar chart currently supports the synthetic design preview only. A live price-series endpoint and its freshness validation are a later integration; the default chart explicitly says no price series is loaded.

Check syntax with `node --check platform/web/app.js`.
