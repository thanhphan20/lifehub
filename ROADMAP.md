# LifeHub Roadmap

A focused, realistic roadmap to evolve **LifeHub** into a personal life tracking system that matches real usage and avoids unnecessary complexity.

---

## 🎯 Vision

LifeHub is a **personal data hub** that helps you understand your body, productivity, and growth over time by combining **manual reflection** with **selective integrations**.

---

## ✅ Completed Milestones (2025-2026)

### Core Infrastructure
- **Hybrid Architecture**: NestJS Gateway + Distributed Workers.
- **Unified SAGA**: Choreography-based event flow with Kafka.
- **Idempotency**: Redis-based deduplication for all SAGA participants.
- **Database**: Prisma-based PostgreSQL source of truth with state-decoupled status tracking.

### Feature Set
- **API Ninjas Enrichment**: NL meal and workout processing replacement for Nutritionix. ✅
- **Unified Ingestion**: Combined NL and structured input SAGA. ✅
- **Worker Consolidation**: Grouped analytics, notion, and enrichment workers into a unified suite. ✅

---

## 📊 Current Focus: Phase 2 – Insights & Hardening

### 1. Health & Fitness Hardening
- **Strava Webhooks**: Transition Strava sync from manual enqueue to full SAGA raw ingestion via webhook payload.
- **Heart Rate & Sleep**: Integrate sleep data (manual-first) to correlate with mood and productivity.
- **Macro Goals**: Add user-defined daily targets for calories and protein.
- **Data Validation**: Implement stricter Zod schemas for enriched data validation before DB persistence.

### 2. Strategic Integrations
- **Google Calendar**: Import life context (trips, milestones) as background events for analytics.
- **LeetCode**: Simple daily habit auto-completion via public GraphQL API and dedicated LeetCode worker.

---

## 📈 Future Phases

### Phase 3 – The Dashboard (UI/UX)
- **Real-time Stats**: Live updates of daily calorie count via SAGA tracker and WebSockets (Socket.io).
- **Weekly Rollups**: Automated Notion summaries of "Week in Review" with trend analysis.
- **Visual Trends**: Mood vs Productivity graphs using `recharts` or `D3`.
- **Mobile PWA**: Optimize the frontend for mobile-first habit logging.

### Phase 4 – Scalability & personalization
- **Multi-user Support**: Multitenancy in SAGA flow (user context isolation) and Auth (Clerk or NextAuth).
- **Custom Adapters**: Plugin system for custom data enrichment (e.g., specific gym apps).
- **Vector Memory**: Store long-term tracking history in a Vector DB (e.g., Pinecone) for LLM-based life coaching.

---

## 🛠️ Tech Stack Evolution

| Current | Future | Reasoning |
| :--- | :--- | :--- |
| **Kafka (Bitnami)** | **Confluent/Redpanda** | Managed scalability and better schema registry support. |
| **OpenAPI** | **tRPC / TypeSpec** | End-to-end type safety between Gateway and Workers. |
| **Redis** | **DragonflyDB** | Better vertical scale for high-throughput idempotency checks. |
| **Standard SQL** | **Presto/Trino** | For complex cross-domain analytics queries. |

---

## 🎯 KPIs & Success Metrics

- **SAGA Completion Rate**: >99.9% of ingestion events reach "DONE" in `syncDetails`.
- **Enrichment Latency**: Average time from `raw.ingest` to `enriched.logged` < 2 seconds.
- **Idempotency Accuracy**: Zero duplicate records in Notion for replayed messages.
- **User Engagement**: % of suggested macro targets met weekly.

---

## 🧱 Architecture Principles

- **Manual-first**: Integrations add context, they don't replace intention.
- **Event-driven**: All side effects are async and traceable.
- **Idempotency by Default**: No message should ever process twice.
- **Schema-first**: Events are defined by strict contracts.

---

> If a feature does not help daily reflection or long-term insight, it does not belong in LifeHub.

Happy building 🚀
