import json
from datetime import datetime
from email.utils import parsedate_to_datetime
import math

import httpx

from .config import Settings
from .storage import Store, utcnow


class Pushover:
    def __init__(self, settings: Settings, client=None):
        self.settings = settings
        self.client = client

    def send(self, payload):
        if not self.settings.can_send:
            raise RuntimeError("notifications_disabled")
        message = (f"{payload['symbol']} · {payload['direction']} setup\n"
                   f"Entry reference {payload['entry']:.2f} | invalidation {payload['invalidation']:.2f}\n"
                   f"Target reference {payload['target']:.2f}\n"
                   f"Observed {payload['observed_at']} | strategy {payload['strategy_version']}\n"
                   f"Signal {payload['signal_id']} | expires {payload['expires_at']}\n"
                   "Research signal; review before acting.")
        data = {
            "token": self.settings.pushover_token, "user": self.settings.pushover_user,
            "title": "SPYBOT · setup found", "message": message, "priority": 0, "ttl": payload["ttl"],
        }
        if self.client is not None:
            return self.client.post("https://api.pushover.net/1/messages.json", data=data)
        with httpx.Client(timeout=10) as client:
            return client.post("https://api.pushover.net/1/messages.json", data=data)


def process_once(store: Store, settings: Settings, sender=None, now: datetime | None = None):
    if not settings.can_send:
        return "disabled"
    supplied_now = now
    now = now or utcnow()
    row = store.claim(now)
    if row is None:
        return "idle"
    sender = sender or Pushover(settings)
    try:
        payload = json.loads(row["payload"])
        expires = datetime.fromisoformat(row["expires_at"])
        send_time = utcnow() if supplied_now is None else now
        remaining = math.floor((expires - send_time).total_seconds())
        if remaining <= 0:
            store.finish(row["id"], "expired", send_time)
            return "expired"
        payload.update(signal_id=row["id"], expires_at=row["expires_at"], ttl=remaining)
        response = sender.send(payload)
    except httpx.ConnectError:
        store.finish(row["id"], "retry", now, "connect_error")
        return "retry"
    except (httpx.TimeoutException, httpx.NetworkError):
        # Read timeouts and dropped connections can occur after acceptance.
        store.finish(row["id"], "delivery_unknown", now, "transport_uncertain")
        return "delivery_unknown"
    except Exception:
        store.finish(row["id"], "delivery_unknown", now, "unexpected_send_error")
        return "delivery_unknown"
    if response.status_code == 429:
        # Retry no sooner than a minute; provider limits can be much longer.
        retry_after = response.headers.get("Retry-After", "60")
        try:
            delay = float(retry_after)
        except ValueError:
            try:
                delay = (parsedate_to_datetime(retry_after) - now).total_seconds()
            except (ValueError, TypeError):
                delay = 60
        if not math.isfinite(delay) or delay < 0:
            delay = 60
        # A delay longer than signal lifetime will cause expiry without another send.
        store.finish(row["id"], "retry", now, "provider_rate_limit", retry_after_seconds=max(60, min(delay, 86400)))
        return "retry"
    if response.status_code >= 500:
        store.finish(row["id"], "delivery_unknown", now, "provider_uncertain")
        return "delivery_unknown"
    try:
        data = response.json()
    except ValueError:
        data = None
    if not isinstance(data, dict):
        store.finish(row["id"], "delivery_unknown", now, "invalid_provider_response")
        return "delivery_unknown"
    accepted = response.is_success and data.get("status") == 1
    status = "provider_accepted" if accepted else "failed"
    store.finish(row["id"], status, now, None if accepted else "provider_rejected", data.get("request") if accepted else None)
    return status
