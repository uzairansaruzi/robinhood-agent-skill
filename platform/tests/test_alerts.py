import tempfile
import unittest
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
import httpx
from fastapi.testclient import TestClient
from pydantic import ValidationError
from server.app import create_app
from server.config import Settings
from server.models import Candidate, rejection_reasons
from server.notifications import process_once, Pushover
from server.storage import Store

class Sender:
    def __init__(self, response=None, error=None):
        self.response, self.error, self.calls = response, error, 0
    def send(self, payload):
        self.calls += 1
        if self.error:
            raise self.error
        return self.response

class AlertTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.now = datetime.now(timezone.utc)
        self.settings = Settings(api_token="test-only-token", database_path=str(Path(self.folder.name) / "alerts.sqlite"))
        self.store = Store(self.settings.database_path)
        self.candidate = Candidate(symbol="SPY", strategy_version="candidate-v1", direction="bullish",
            observed_at=self.now, mode="live", entry=100, invalidation=99, target=102,
            evidence={key: True for key in ["price", "flow", "gamma", "liquidity", "no_chop", "event_clear"]},
            source_ids=["provider-snapshot-1"])
        self.enabled = replace(self.settings, strategy_approved=True, notifications_enabled=True, pushover_token="test", pushover_user="test")
    def tearDown(self):
        self.folder.cleanup()
    def test_default_pending_review(self):
        self.assertEqual(rejection_reasons(self.candidate, False, self.now), ["strategy_pending_review"])
    def test_rejects_stale_future_and_nonlive(self):
        for changed, expected in [
            ({"observed_at": self.now-timedelta(seconds=61)}, "stale_data"),
            ({"observed_at": self.now+timedelta(seconds=6)}, "future_timestamp"),
            ({"mode": "replay"}, "non_live_source")]:
            self.assertIn(expected, rejection_reasons(self.candidate.model_copy(update=changed), True, self.now))
    def test_strict_evidence_aware_time_finite_and_level_order(self):
        raw = self.candidate.model_dump()
        for field, value in [("observed_at", datetime.now()), ("entry", float("nan")), ("target", 98)]:
            with self.subTest(field=field), self.assertRaises(ValidationError):
                Candidate(**{**raw, field: value})
        with self.assertRaises(ValidationError):
            Candidate(**{**raw, "evidence": {**raw["evidence"], "flow": "true"}})
    def test_missing_evidence_blocks(self):
        changed = self.candidate.model_copy(update={"evidence": self.candidate.evidence.model_copy(update={"flow": False})})
        self.assertIn("missing_flow", rejection_reasons(changed, True, self.now))
    def test_transactional_duplicate_and_disabled_delivery(self):
        first, second = self.store.enqueue(self.candidate,self.now), self.store.enqueue(self.candidate,self.now)
        self.assertEqual(first[0], second[0]); self.assertTrue(first[1]); self.assertFalse(second[1])
        sender = Sender()
        self.assertEqual(process_once(self.store,self.settings,sender,self.now), "disabled")
        self.assertEqual(sender.calls, 0)
    def test_provider_accepted_not_device_delivered(self):
        self.store.enqueue(self.candidate,self.now)
        sender = Sender(httpx.Response(200,json={"status":1,"request":"provider-request"}))
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now), "provider_accepted")
        self.assertIsNone(self.store.list_signals()[0]["device_delivered"])
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now), "idle")
        self.assertEqual(sender.calls,1)
    def test_expiry_prevents_send(self):
        self.store.enqueue(self.candidate,self.now)
        sender = Sender()
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=121)),"idle")
        self.assertEqual(self.store.list_signals()[0]["status"],"expired"); self.assertEqual(sender.calls,0)
    def test_uncertain_delivery_not_blindly_retried(self):
        self.store.enqueue(self.candidate,self.now)
        sender = Sender(error=httpx.ReadTimeout("test"))
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now),"delivery_unknown")
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=10)),"idle")
        self.assertEqual(sender.calls,1)
    def test_connect_errors_retry_then_exhaust(self):
        self.store.enqueue(self.candidate,self.now)
        sender = Sender(error=httpx.ConnectError("test"))
        for seconds in (0,31,92):
            process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=seconds))
        self.assertEqual(self.store.list_signals()[0]["status"],"failed"); self.assertEqual(sender.calls,3)
    def test_rate_limit_respects_retry_after_and_expiry(self):
        self.store.enqueue(self.candidate,self.now)
        sender = Sender(httpx.Response(429,headers={"Retry-After":"90"}))
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now),"retry")
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=89)),"idle")
        self.assertEqual(sender.calls,1)
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=121)),"idle")
        self.assertEqual(self.store.list_signals()[0]["status"],"expired")
        self.assertEqual(sender.calls,1)
    def test_rate_limit_date_has_minimum_sixty_seconds(self):
        from email.utils import format_datetime
        self.store.enqueue(self.candidate,self.now)
        sender=Sender(httpx.Response(429,headers={"Retry-After":format_datetime(self.now+timedelta(seconds=10))}))
        process_once(self.store,self.enabled,sender,self.now)
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now+timedelta(seconds=59)),"idle")
        self.assertEqual(sender.calls,1)
    def test_notification_contains_identity_and_remaining_ttl(self):
        self.store.enqueue(self.candidate,self.now)
        captured=[]
        class Capture:
            def send(inner,payload):
                captured.append(payload)
                return httpx.Response(200,json={"status":1})
        process_once(self.store,self.enabled,Capture(),self.now+timedelta(seconds=40))
        self.assertEqual(captured[0]["ttl"],80)
        self.assertIn("signal_id",captured[0]); self.assertIn("expires_at",captured[0])
        requests=[]
        def handle(request):
            requests.append(request)
            return httpx.Response(200,json={"status":1})
        with httpx.Client(transport=httpx.MockTransport(handle)) as client:
            Pushover(self.enabled,client).send(captured[0])
        from urllib.parse import parse_qs
        form=parse_qs(requests[0].content.decode())
        self.assertIn(captured[0]["signal_id"],form["message"][0])
        self.assertIn(captured[0]["expires_at"],form["message"][0])
        self.assertEqual(form["ttl"],["80"])
    def test_malformed_provider_json_is_uncertain(self):
        self.store.enqueue(self.candidate,self.now)
        sender=Sender(httpx.Response(200,json=["unexpected-array"]))
        self.assertEqual(process_once(self.store,self.enabled,sender,self.now),"delivery_unknown")
        self.assertEqual(self.store.list_signals()[0]["error_code"],"invalid_provider_response")
    def test_auth_and_candidate_contract(self):
        with TestClient(create_app(self.settings)) as client:
            self.assertEqual(client.get("/healthz").status_code,200)
            self.assertEqual(client.get("/api/status").status_code,401)
            auth={"Authorization":"Bearer test-only-token"}
            status=client.get("/api/status",headers=auth).json()
            self.assertEqual(status["automation"],"blocked"); self.assertEqual(status["strategy_status"],"pending_review")
            self.assertNotIn("test-only-token",str(status))
            result=client.post("/api/candidates",headers=auth,json=self.candidate.model_dump(mode="json")).json()
            self.assertEqual(result["status"],"blocked")
            self.assertEqual(client.get("/api/signals",headers=auth).json(),[])
        with TestClient(create_app(replace(self.settings,api_token=""))) as client:
            self.assertEqual(client.get("/api/status").status_code,503)
if __name__ == "__main__":
    unittest.main()
