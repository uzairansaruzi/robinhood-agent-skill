# SPYBOT — signal notification platform

Automated execution means a notification to Dakota's phone/computer. This application has no order-placement or broker connection.

**Current status: local foundation, not an operating market scanner.** The API, mobile dashboard, candidate evidence gates, SQLite development outbox and Pushover worker are implemented. Real collectors, strategy evaluation, PostgreSQL, identity-aware cloud deployment and device delivery verification remain outstanding. Strategy parameters remain pending review. The older `dashboard/` research page is preserved.

## Start locally

From this directory, use Python 3.12:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DASHBOARD_API_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
python -m uvicorn server.app:create_app --factory --host 127.0.0.1 --port 8080
```

Open `http://127.0.0.1:8080`. Enter the local dashboard token in Settings to view protected API status. The browser keeps this dashboard access token only for the session. Never enter market-data, OpenAI or Pushover credentials in the frontend. The `.env.example` file documents environment names; files are not automatically loaded.

Start the worker in another terminal with the same environment and working directory:

```bash
python -m server.worker
```

The worker sends nothing with default configuration. Pushover delivery requires approved strategy configuration, notifications enabled, an app token and a recipient key. Configure secrets on the server only. Do not enable these flags as a substitute for implementing and validating real collectors and strategy rules.

## API

| Route | Access | Behavior |
|---|---|---|
| `GET /healthz` | Public | Process liveness only; not proof of data/notification health |
| `GET /api/status` | Bearer token | Honest setup/provider state and implementation blockers |
| `GET /api/signals` | Bearer token | Last 100 queued candidate records and delivery states |
| `POST /api/candidates` | Bearer token | Validate a trusted producer's candidate; block unapproved/non-live/stale/incomplete evidence, otherwise enqueue uniquely |

Candidate ingestion accepts producer assertions, not raw market evidence. It does not establish that a setup is profitable or compute strategy conditions. Source timestamps, entitlement and evidence evaluation must be supplied by the planned collector/strategy pipeline. Browser demo values are synthetic and never sent as real signals.

## Verify

```bash
python -m unittest discover -s tests -v
node --check web/app.js
```

No external APIs or notification sends are needed by the tests. Provider credential validation and real device receipt remain separate activation checks.

## Structure

```text
platform/
  web/                  responsive dashboard, explicit demo isolation
  server/
    app.py              authenticated API and static UI
    models.py           typed candidate/evidence and deterministic gates
    config.py           server-only configuration, disabled defaults
    storage.py          SQLite development outbox and unique signals
    notifications.py    Pushover transport and bounded processing
    worker.py           notification process, graceful shutdown
  tests/                API and signal delivery behavior checks
  docs/
    API_RESEARCH.md     official API/MCP routes, auth, caveats and links
    ARCHITECTURE.md     production structure and implementation milestones
  deploy/               production handoff; no resources provisioned
```

Recommended production: Cloud Run API + persistent worker pool + Cloud SQL PostgreSQL + Secret Manager. **Do not deploy the current SQLite database onto ephemeral Cloud Run storage or separate hosts.** Start with the [deployment handoff](deploy/README.md), [architecture](docs/ARCHITECTURE.md) and [API reference](docs/API_RESEARCH.md).
