# LifeHub — Diagrams (PlantUML) + SQL Schema

This document contains **PlantUML** diagrams (business flow, infrastructure, event flow) and **Postgres (psql) DDL/code snippets** so you can visualize the diagram using PlantUML and try out the schema locally.

---

## 1) Business Flow (PlantUML)

Save the following to the file `diagrams/business-flow.puml` and render it using PlantUML.

```plantuml
@startuml
title LifeHub — Business Flow
actor User as U
participant "Frontend\n(Web/Mobile)" as FE
participant "API Gateway\n(NestJS)" as API
database "Postgres / Supabase" as DB
queue "Kafka\n(event topics)" as KAFKA
participant "Notion Consumer" as NOTION
participant "Indexer\n(Elasticsearch)" as INDEXER
participant "Redis" as REDIS
participant "RabbitMQ/Bull" as QUEUE

U -> FE : enters workout log
FE -> API : POST /log/workout {payload}
API -> DB : BEGIN TRANSACTION
API -> DB : INSERT activity_log
API -> DB : INSERT outbox(event)
API -> DB : COMMIT
API -> REDIS : set cache (recent logs)
API -> KAFKA : produce "workout.created" (or outbox daemon publishes)
API -> FE : 200 OK + websocket emit

KAFKA -> NOTION : consume 'workout.created'
NOTION -> NOTION : map -> Notion payload
NOTION -> NOTION : call Notion API
NOTION -> DB : update notion_sync_status
NOTION -> QUEUE : on failure -> push retry job

KAFKA -> INDEXER : consume -> update Elasticsearch
INDEXER -> Elasticsearch : index document

QUEUE -> NOTION : retry jobs (backoff)

@enduml
```

---

## 2) Infrastructure Architecture (PlantUML)

Save the following file `diagrams/infrastructure.puml`.

```plantuml
@startuml
title LifeHub — Infrastructure Overview
skinparam componentStyle rectangle

package "Edge / Clients" {
  [Web App] as FE
  [Mobile App] as MOBILE
}

package "Ingress" {
  [Nginx LB / TLS Termination] as NGINX
}

package "Application" {
  [API Gateway\n(NestJS)\nPM2 / Containers] as API
  [Socket.IO / SSE] as WS
}

package "Data & Messaging" {
  database "Postgres / Supabase" as DB
  queue "Kafka Cluster" as KAFKA
  queue "RabbitMQ" as RMQ
  [Redis (Cache/BullMQ)] as REDIS
  [Elasticsearch] as ES
}

package "Workers / Consumers" {
  [Notion Consumer\n(Node/Python)] as NC
  [Indexer Service] as IDX
  [Analytics Worker\n(Celery/BullMQ)] as AW
}

package "Storage & Cloud" {
  [S3 / MinIO] as S3
  [Docker Registry / ECR] as REG
}

FE --> NGINX
MOBILE --> NGINX
NGINX --> API
API --> DB
API --> KAFKA
API --> REDIS
API --> WS
KAFKA --> NC
KAFKA --> IDX
NC --> NotionAPI
IDX --> ES
NC --> RMQ : push retry on fail
AW --> RMQ
REDIS --> WS : pub/sub

@enduml
```

---

## 3) Event Flow Diagram (PlantUML)

Save the following file `diagrams/event-flow.puml`.

```plantuml
@startuml
title LifeHub — Event Flow
actor User
participant API
queue Kafka
participant OutboxDaemon
participant NotionConsumer
participant Indexer
participant RabbitMQ
participant BullMQ
participant AnalyticsWorker

User -> API : POST /log (workout)
API -> DB : write activity & outbox
API -> Kafka : (or OutboxDaemon publishes) produce workout.created
note right: event payload includes: activity_id, user_id, timestamp, type, meta

Kafka -> NotionConsumer : workout.created
NotionConsumer -> NotionAPI : create page
alt notion success
  NotionConsumer -> DB : update sync_status = synced
else notion failure
  NotionConsumer -> RabbitMQ : push notion_retry(job)
end

Kafka -> Indexer : workout.created
Indexer -> ES : index document

RabbitMQ -> NotionRetryWorker : consume retry job
NotionRetryWorker -> NotionAPI : retry call

Kafka -> AnalyticsWorker : workout.created
AnalyticsWorker -> DB : increment aggregates / write daily summary

Kafka -> BullMQ : emit lightweight jobs (notifications)
BullMQ -> PushService : deliver push notification

@enduml
```

---

## 4) Postgres (psql) Schema & snippets

Save to `db/schema.sql` and run `psql -f db/schema.sql` (or use Supabase SQL editor).

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  volume numeric,
  created_at timestamptz DEFAULT now(),
  sync_status text DEFAULT 'pending'
);

-- Outbox pattern table
CREATE TABLE IF NOT EXISTS outbox (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  topic text NOT NULL,
  payload jsonb NOT NULL,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notion syncs
CREATE TABLE IF NOT EXISTS notion_syncs (
  id bigserial PRIMARY KEY,
  activity_id uuid REFERENCES activity_logs(id) ON DELETE CASCADE,
  notion_page_id text,
  status text,
  last_error text,
  updated_at timestamptz DEFAULT now()
);

-- Analytics materialized view example
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_user_volume AS
SELECT
  user_id,
  date_trunc('day', created_at) AS day,
  sum((payload->>'volume')::numeric) AS total_volume
FROM activity_logs
GROUP BY user_id, date_trunc('day', created_at);

-- Indexes for search/performance
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_outbox_published ON outbox(published);

-- Example transaction: write activity + outbox
BEGIN;
  INSERT INTO activity_logs(user_id, type, payload) VALUES
  ('00000000-0000-0000-0000-000000000001','deadlift', '{"sets":4,"reps":6,"weight":120}'::jsonb)
  RETURNING id;
  -- suppose returned id = <activity_id>
  INSERT INTO outbox(aggregate_type, aggregate_id, topic, payload) VALUES
  ('activity', '<activity_id>'::uuid, 'workout.created', json_build_object('activity_id', '<activity_id>'));
COMMIT;

-- Outbox daemon pseudo-query to publish
SELECT id, topic, payload FROM outbox WHERE published = false ORDER BY created_at LIMIT 100;
-- after publish -> UPDATE outbox SET published = true WHERE id IN (...)
```

---
