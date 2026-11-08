"""Single-host development persistence. Use PostgreSQL before replicated deployment."""
import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .models import Candidate


def utcnow():
    return datetime.now(timezone.utc)


class Store:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS signals (
                id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                available_at TEXT NOT NULL, error_code TEXT, lease_until TEXT,
                provider_request_id TEXT)""")

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def enqueue(self, candidate: Candidate, now: datetime):
        payload = candidate.model_dump(mode="json")
        # One alert per symbol/strategy/direction/observation minute, even across retries.
        identity = [candidate.symbol, candidate.strategy_version, candidate.direction,
                    candidate.observed_at.astimezone(timezone.utc).replace(second=0, microsecond=0).isoformat()]
        signal_id = hashlib.sha256(json.dumps(identity).encode()).hexdigest()[:24]
        expires = candidate.observed_at.astimezone(timezone.utc) + timedelta(seconds=120)
        with self.connection() as db:
            result = db.execute("""INSERT OR IGNORE INTO signals
                (id,payload,created_at,expires_at,status,available_at) VALUES (?,?,?,?,?,?)""",
                (signal_id, json.dumps(payload), now.isoformat(), expires.isoformat(), "pending", now.isoformat()))
            inserted = result.rowcount == 1
        return signal_id, inserted

    def list_signals(self):
        with self.connection() as db:
            rows = db.execute("SELECT * FROM signals ORDER BY created_at DESC LIMIT 100").fetchall()
        return [{"id": row["id"], **json.loads(row["payload"]), "created_at": row["created_at"],
                 "expires_at": row["expires_at"], "status": row["status"], "attempts": row["attempts"],
                 "error_code": row["error_code"], "device_delivered": None} for row in rows]

    def claim(self, now: datetime):
        stamp = now.isoformat()
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE signals SET status='expired' WHERE status IN ('pending','retry','sending') AND expires_at<=?", (stamp,))
            # A crashed/uncertain send must not be blindly resent: provider may have accepted it.
            db.execute("UPDATE signals SET status='delivery_unknown', error_code='worker_interrupted' WHERE status='sending' AND lease_until<=?", (stamp,))
            row = db.execute("""SELECT * FROM signals WHERE status IN ('pending','retry')
                AND available_at<=? AND attempts<3 ORDER BY created_at LIMIT 1""", (stamp,)).fetchone()
            if row:
                db.execute("UPDATE signals SET status='sending', attempts=attempts+1, lease_until=? WHERE id=?",
                           ((now + timedelta(seconds=60)).isoformat(), row["id"]))
                return dict(row)
        return None

    def finish(self, signal_id, status, now, error_code=None, provider_request_id=None, retry_after_seconds=None):
        with self.connection() as db:
            row = db.execute("SELECT attempts FROM signals WHERE id=?", (signal_id,)).fetchone()
            if status == "retry" and row["attempts"] >= 3:
                status = "failed"
            db.execute("""UPDATE signals SET status=?, available_at=?, error_code=?,
                provider_request_id=?, lease_until=NULL WHERE id=?""",
                (status, (now + timedelta(seconds=retry_after_seconds if retry_after_seconds is not None else 15 * 2 ** row["attempts"])).isoformat(),
                 error_code, provider_request_id, signal_id))
