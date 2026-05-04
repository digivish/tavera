# TODOS.md — Tavera

## Deferred Work

### Weekly Email Digest
- **What:** Summary email showing portfolio health changes (suppliers improved/degraded, new critical flags)
- **Why:** Food safety managers don't live in dashboards — they need signal pushed to them. Lowest-effort, highest-value addition to the alert pipeline.
- **Effort:** S (1 day human / ~15 min CC+gstack)
- **Priority:** P1 — first post-MVP feature
- **Depends on:** Alert pipeline (Phase 4), email delivery service (SendGrid/Mailgun)

### Webhook Staleness Auto-Disable
- **What:** When a webhook endpoint is consistently down for 7+ days, auto-disable it and notify the subscription owner
- **Why:** Prevents silent delivery failures accumulating indefinitely. Without this, webhook consumers who move/retire endpoints leave zombie subscriptions.
- **Effort:** S (~4 hours human / ~10 min CC+gstack)
- **Priority:** P2 — important for production hygiene
- **Depends on:** Webhook delivery service

### Adaptive Backoff for External APIs
- **What:** Stale-while-revalidate caching with adaptive backoff for BC government API calls
- **Why:** Current plan uses fixed TTLs. Adaptive backoff is more resilient when government APIs are under load or returning intermittent errors.
- **Effort:** S (~4 hours human / ~15 min CC+gstack)
- **Priority:** P2 — current TTL-based approach is sufficient for MVP
- **Depends on:** Data source adapters (Phase 2)

### Supplier Trend Sparklines
- **What:** Mini sparkline charts on supplier directory rows and detail profiles showing score trend over time
- **Why:** A single score (76/100) is less useful than the trajectory (was 62, now 76 = improving). Power users need direction, not just position.
- **Effort:** M (1-2 days human / ~30 min CC+gstack)
- **Priority:** P2 — UX enhancement, not launch blocking
- **Depends on:** Historical score storage, frontend chart library

### Multi-Tenant Architecture
- **What:** Allow food safety consultants to manage multiple client organizations under one login
- **Why:** The Bistro Group example in the designs suggests agencies managing supplier portfolios for multiple restaurants. Multi-tenancy is the natural architecture.
- **Effort:** L (1 week human / ~2 hours CC+gstack)
- **Priority:** P3 — post-launch, validate single-tenant usage first
- **Depends on:** User model, auth system, organization-scoped queries
