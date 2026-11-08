# Production handoff — not deployed

Target: Google Cloud, one region, owner-only dashboard. The Dockerfile builds the local foundation; it is not a full production deployment recipe because production PostgreSQL and collectors are still missing.

## Required before provisioning

1. Select project, region and operating budget. Check worker-pool availability and quotas in that region. No cloud account, billing or deployment access has been validated in this session.
2. Implement PostgreSQL storage/migrations and transactional outbox. Use row locking/skip-locked claims and bounded leases; test concurrent workers, crashes, restore and idempotency. Do not share SQLite across service containers.
3. Implement/validate UW and optional licensed price collector, calendar, source archive and the versioned strategy engine. Bind approvals to exact strategy versions. Verify stale/delayed/missing data blocks each relevant strategy.
4. Create separate service identities for API, collector, notifications and research. Keep provider secrets in Secret Manager. The browser receives no provider credentials.
5. Configure private dashboard identity (IAP/verified OIDC). The starter bearer token is a local access mechanism. Public TradingView ingress must be isolated and sender-authenticated, not pointed directly at the protected candidate endpoint.

## Runtime

- Cloud Run API handles authenticated HTTP and serves assets; run liveness and separate readiness/freshness checks.
- One persistent worker-pool collector initially; one notification worker. Use appropriate resource sizing and restart policies. Reconnect sockets and reconcile missing intervals after restarts.
- Cloud SQL PostgreSQL, same region, connection pooling and connection caps; managed backups and restore rehearsal.
- Cloud Storage raw-event retention. Never commit market archives or secrets to GitHub.
- Scheduler runs calendar refresh/pre-session/reconciliation/summary jobs in exchange timezone; exchange calendar is authoritative for sessions.
- Optional Pub/Sub for event fan-out or Cloud Tasks for HTTP processing only when needed. Both need application idempotency; do not assume exact timing or exactly-once notifications.

## Delivery automation

GitHub Actions should test pull requests, then build a versioned image after merge and use Workload Identity Federation/OIDC for deployment. Restrict federation to this repository's immutable repository/owner IDs, expected refs and deployment environment. Do not copy an old subject-string example blindly: GitHub documents newer default subjects for repositories created/renamed/transferred after 2026-07-15. Use the actual token claims when setting conditions. Pin deployment actions to reviewed commits before production enablement.

No deploy workflow is enabled by this change; the CI workflow only checks code. A deployment should record commit SHA, image digest, migrations, strategy version, rollback plan and health observations. Budget alerts and monitoring must exist before leaving a scanner unattended.

## Activation evidence

Record actual provider auth/entitlement checks, fresh data ages, confirmed session/early-close behavior, disconnected-feed blocking, pending-outbox recovery, disabled-notification checks, expired alert suppression, and a labeled test received on the owner's phone/computer. Review 30–60 sessions of forward paper evaluation from the existing strategy sign-off. Provider acceptance alone is not device delivery. Never label the system live based only on configured environment variables.
