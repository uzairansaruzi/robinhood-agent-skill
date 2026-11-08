import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles

from .config import Settings
from .models import Candidate, rejection_reasons
from .storage import Store


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_environment()
    app = FastAPI(title="SPYBOT Alert Platform", docs_url=None, redoc_url=None, openapi_url=None)
    store = Store(settings.database_path)
    bearer = HTTPBearer(auto_error=False)

    def authorize(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
        if not settings.api_token:
            raise HTTPException(503, "Dashboard access has not been configured")
        if credentials is None or not secrets.compare_digest(credentials.credentials, settings.api_token):
            raise HTTPException(401, "Dashboard access token required", headers={"WWW-Authenticate": "Bearer"})

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
        return response

    @app.get("/healthz")
    def health():
        return {"status": "ok", "service": "spybot-alert-platform"}

    @app.get("/api/status", dependencies=[Depends(authorize)])
    def status():
        pairs = [("Unusual Whales", bool(os.getenv("UW_API_TOKEN"))),
                 ("Market data", bool(os.getenv("ALPACA_API_KEY")) and bool(os.getenv("ALPACA_SECRET_KEY"))),
                 ("Pushover", bool(settings.pushover_token and settings.pushover_user)),
                 ("OpenAI", bool(os.getenv("OPENAI_API_KEY")))]
        return {"mode": "research", "automation": "blocked", "strategy_status": "approved" if settings.strategy_approved else "pending_review",
                "notifications_enabled": settings.notifications_enabled,
                "providers": [{"name": name, "status": "configured_unverified" if present else "missing"} for name, present in pairs],
                "signals": store.list_signals(), "server_time": datetime.now(timezone.utc).isoformat(),
                "timezone": "America/New_York", "storage": "sqlite_development_single_host",
                "blockers": ["Market ingestion and strategy scanner are not implemented", "Production PostgreSQL deployment is not configured"],
                "device_delivered": None}

    @app.get("/api/signals", dependencies=[Depends(authorize)])
    def signals():
        return store.list_signals()

    @app.post("/api/candidates", dependencies=[Depends(authorize)])
    def candidates(candidate: Candidate):
        now = datetime.now(timezone.utc)
        reasons = rejection_reasons(candidate, settings.strategy_approved, now)
        if reasons:
            return {"status": "blocked", "reasons": reasons}
        signal_id, inserted = store.enqueue(candidate, now)
        return {"status": "queued" if inserted else "duplicate", "id": signal_id, "notification_enabled": settings.can_send}

    web = Path(__file__).resolve().parents[1] / "web"
    if web.is_dir():
        app.mount("/", StaticFiles(directory=web, html=True), name="dashboard")
    return app
