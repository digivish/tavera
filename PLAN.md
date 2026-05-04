# Tavera MVP — Implementation Plan

**Date:** 2026-05-04 | **Approach:** Backend-First API | **Stack:** Python/FastAPI + Postgres + React (deferred)

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TAVERA PLATFORM                               │
│                                                                       │
│  ┌──────────────┐    ┌───────────────────────────────────────────┐   │
│  │ React/Vite    │    │  FastAPI Server (REST API)                │   │
│  │ Frontend      │◄───│  /api/v1/suppliers, /alerts, /webhooks   │   │
│  │ (deferred)    │    │                                           │   │
│  └──────────────┘    │  ┌───────────┐ ┌──────────┐ ┌──────────┐  │   │
│                       │  │ Mapping   │ │ Scoring  │ │ Alert    │  │   │
│  ┌──────────────┐    │  │ Engine    │ │ Engine   │ │ Pipeline │  │   │
│  │ External API │◄───│  └─────┬─────┘ └────┬─────┘ └────┬─────┘  │   │
│  │ Consumers    │    │        │            │            │         │   │
│  └──────────────┘    │  ┌─────▼────────────▼────────────▼─────┐  │   │
│                       │  │      Data Source Adapters           │  │   │
│  ┌──────────────┐    │  │  OrgBook BC │ Fraser Health │ VCH   │  │   │
│  │ Webhook      │◄───│  └─────────────────────────────────────┘  │   │
│  │ Consumers    │    └──────────────────┬──────────────────────────┘   │
│  └──────────────┘                       │                               │
│                        ┌────────────────▼──────────────────────┐       │
│                        │           PostgreSQL                   │       │
│                        │  (self-hosted Ubuntu server)           │       │
│                        └───────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Source Adapter Pattern

```
                    ┌─────────────────────┐
                    │   DataSourceAdapter  │  ← Protocol/ABC
                    │  fetch(since) → Raw[]│
                    │  normalize(raw) → Inf│
                    │  health_check() → bool│
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
  ┌───────▼───────┐ ┌────────▼────────┐ ┌────────▼────────┐
  │ OrgBookBC     │ │ FraserHealth    │ │ VCH             │
  │ entity lookup │ │ inspections     │ │ inspections     │
  └───────────────┘ └─────────────────┘ └─────────────────┘
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend language | Python/FastAPI | Stronger data ecosystem (rapidfuzz, pandas, SQLAlchemy) |
| Database | Self-hosted PostgreSQL | Own infrastructure, no Supabase dependency needed |
| Fuzzy matching | rapidfuzz + alias table | Auditable, debuggable, handles "Ltd"/"Limited" patterns |
| Auth (dashboard) | Supabase Auth or JWT | TBD — session-based for web UI |
| Auth (API) | API keys in header | `X-API-Key` middleware, scoped to read/write |
| Rate limiting | Per-source TTL cache | Known staleness window for data integrity |
| Scoring on partial data | Show score with degradation indicator | "Score: 76/100* — 1 of 2 sources available" |
| CSV partial import | 200 OK with error summary | `{imported: 188, failed: 12, errors: [...]}` |
| Migrations | Alembic (UP + DOWN) | Forward-only until launch, then reversible |
| Logging | structlog JSON | Structured, bindable context per request |

## Project Structure

```
tavera/
├── app/
│   ├── main.py              # FastAPI app factory
│   ├── config.py             # pydantic-settings config
│   ├── models/
│   │   ├── supplier.py       # SQLAlchemy model
│   │   ├── infraction.py
│   │   └── webhook.py
│   ├── schemas/
│   │   ├── supplier.py       # Pydantic request/response
│   │   └── infraction.py
│   ├── adapters/
│   │   ├── base.py           # DataSource protocol
│   │   ├── orgbook_bc.py
│   │   ├── fraser_health.py
│   │   └── vch.py
│   ├── services/
│   │   ├── mapping.py
│   │   ├── scoring.py
│   │   ├── alerts.py
│   │   ├── webhooks.py
│   │   └── csv_import.py
│   ├── middleware/
│   │   └── api_key.py
│   └── routes/
│       ├── suppliers.py
│       ├── alerts.py
│       └── webhooks.py
├── tests/
├── alembic/
├── pyproject.toml
├── scripts/
│   ├── cron_alert_pipeline.py
│   └── smoke_test.sh
├── .env.example
└── .gitignore
```

## Implementation Sequence

### Phase 1: Foundation
1. `git init`, `.gitignore`, `.env.example`
2. Project scaffold, dependencies
3. Database models (Supplier, Infraction, WebhookSubscription, ApiKey, CsvUpload)
4. Alembic initial migration
5. Config, FastAPI app factory, health check endpoint

### Phase 2: Data Pipeline (critical path)
6. `DataSourceAdapter` protocol
7. OrgBook BC adapter — validate against real API
8. Fraser Health adapter — validate against real API
9. VCH adapter — validate against real API
10. Mapping engine (rapidfuzz + alias table)
11. Scoring engine (weighted aggregation, partial score support)

### Phase 3: API Surface
12. Supplier routes — list, search, detail
13. CSV import endpoint
14. API key middleware
15. Webhook CRUD + delivery service

### Phase 4: Alert Pipeline
16. Cron script (daily check of monitored suppliers)
17. Webhook dispatch with retry/backoff

### Phase 5: Polish
18. Supplier comparison endpoint
19. Error handling audit (see Error Registry below)
20. Tests, smoke tests, health check validation

## Error & Rescue Registry — Critical Gaps to Fix

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | `ConfigError` unhandled in ScoringEngine | CRITICAL | Validate config at FastAPI startup, fail fast |
| 2 | External API timeouts unhandled | CRITICAL | Timeout wrapper + retry with backoff on all adapters |
| 3 | External API rate limits unhandled | CRITICAL | Rate limit detection + backoff on all adapters |

## Security Pre-Commit Checklist

- [ ] `.env` + `.gitignore` before first commit
- [ ] Webhook URL validation (reject non-HTTPS, reject private IPs — SSRF prevention)
- [ ] CSV formula sanitization (strip leading `=`, `@`, `+`, `-` from cell values)
- [ ] API key scoping (read vs read-write)

## Test Coverage Contract

- Adapter unit tests: fetch, normalize, timeout, rate limit, malformed data (x3 adapters)
- Mapping engine: fuzzy match "Ltd"/"Limited", no match, empty input
- Scoring engine: aggregate, partial (down source), no data
- CSV import: valid import, missing column, too large, wrong mime, partial success, duplicates
- API integration: 200, 401, 403, 404, 413, 415, 422, 429
- Webhook delivery: success, timeout retry, backoff after 3 failures
- Chaos test: kill one data source, verify partial scores + no crash + correct logs

## Performance Contract

| Threshold | Target |
|-----------|--------|
| CSV parse (5,000 rows) | <5s streaming |
| Fuzzy match per row | <100ms |
| Scoring (3 external calls) | <500ms (concurrent) |
| Alert cron (1,000 suppliers) | <5 min total |
| API list (50 results) | <200ms |
| API profile | <500ms (cached score) |
| N+1 queries | Zero tolerance |

## Design State Coverage (to implement during UI phase)

| Feature | Loading | Empty | Error |
|---------|---------|-------|-------|
| Dashboard | Skeleton cards + pulse | "Add your first supplier" CTA | Degraded indicator |
| Supplier Directory | Table skeleton rows | "No matches" + clear filters | Toast notification |
| Supplier Profile | Skeleton profile + gauge | N/A | "Infraction history unavailable" |

## Phase 2 & Beyond

- React frontend from design screens
- Weekly email digest (deferred to TODOS.md)
- Multi-province data source expansion (enabled by adapter pattern)
- ML-based risk prediction (uses accumulated historical data)
- Webhook staleness auto-disable (>7 days down → notify owner)
