# LifeHub Architecture

## Overview

LifeHub uses a **hybrid microservices architecture** with PostgreSQL, Kafka, and RabbitMQ to provide a robust, scalable workout logging system.

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│ (REST API)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      NestJS Hybrid Application         │
│  ┌──────────────────────────────────┐   │
│  │  HTTP Server (REST API)          │   │
│  │  - GET /workouts                 │   │
│  │  - POST /workouts                │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Microservices (RabbitMQ)        │   │
│  │  - Queue: workout_queue          │   │
│  └──────────────────────────────────┘   │
└──────┬───────────────────┬───────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐   ┌─────────────┐
│ PostgreSQL  │   │  RabbitMQ   │
│  (Prisma)   │   │   Queue     │
│             │   │  Manager    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 ▼
       │         ┌─────────────┐
       │         │ Notion Sync │
       │         │  Consumer   │
       │         └─────────────┘
       │
       ▼
┌─────────────┐
│   Kafka     │
│ (Event Log) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Analytics  │
│  Consumers  │
└─────────────┘
```

## Components

### 1. PostgreSQL + Prisma (Source of Truth)

**Purpose**: Primary database for all workout logs

**Schema**:

- `WorkoutLog`: Core workout data (type, sets, reps, weight, timestamps)
- `NotionSyncStatus`: Tracks synchronization status with Notion

**Benefits**:

- ACID transactions
- Strong consistency
- Rich querying capabilities
- Prisma ORM for type safety

### 2. Kafka (Event Streaming)

**Purpose**: High-throughput event streaming for analytics and multiple consumers

**Topics**:

- `workout-logs`: All workout log events

**Use Cases**:

- Analytics and reporting
- Search indexing (Elasticsearch)
- Multiple downstream consumers
- Event sourcing

**Characteristics**:

- High throughput
- Distributed
- Event retention
- Fire-and-forget (non-blocking)

### 3. RabbitMQ (Task Processing)

**Purpose**: Reliable task queue with guaranteed delivery and retries

**Queues**:

- `notion-sync-queue`: Tasks for Notion synchronization
- `workout_queue`: Microservice communication queue

**Use Cases**:

- Notion synchronization with retries
- Guaranteed message delivery
- Task scheduling
- Dead letter queue handling

**Characteristics**:

- Guaranteed delivery
- Message acknowledgments
- Retry mechanisms
- Durability

### 4. NestJS Hybrid Application

**Purpose**: Unified API gateway supporting both HTTP and microservices

**Features**:

- HTTP REST API for external clients
- RabbitMQ microservices for internal communication
- Both run simultaneously on the same application instance

**Benefits**:

- Single deployment unit
- Shared dependencies and services
- Unified logging and monitoring

## Data Flow

### Creating a Workout Log

1. **Client Request** → `POST /workouts` (HTTP REST API)
2. **Validation** → DTO validation and correlation ID extraction
3. **Database Write** → Save to PostgreSQL via Prisma (transactional)
4. **Kafka Event** → Publish to `workout-logs` topic (non-blocking, fire-and-forget)
5. **RabbitMQ Task** → Queue task in `notion-sync-queue` (blocking, guaranteed)
6. **Response** → Return 201 Created with workout ID

### Synchronizing to Notion

1. **RabbitMQ Consumer** → Consumes from `notion-sync-queue`
2. **Notion API Call** → Creates page in Notion database
3. **Status Update** → Updates `NotionSyncStatus` in PostgreSQL
   - Success: Status → `SYNCED`, update `syncedAt`
   - Failure: Status → `FAILED` or `RETRYING`, increment `retryCount`

### Event Processing (Kafka)

1. **Kafka Consumer** → Subscribes to `workout-logs` topic
2. **Multiple Consumers** → Can process independently
   - Analytics service
   - Search indexing
   - Notification service
   - etc.

## Message Broker Strategy

### Why Both Kafka and RabbitMQ?

**Kafka** is ideal for:

- High-throughput event streaming
- Multiple consumers reading the same events
- Event sourcing and replay
- Analytics and big data processing

**RabbitMQ** is ideal for:

- Reliable task processing with acknowledgments
- Guaranteed delivery with retries
- Work queues with backpressure
- Complex routing patterns

### Use Case Mapping

| Feature                    | Broker   | Reason                                              |
| -------------------------- | -------- | --------------------------------------------------- |
| Workout log events         | Kafka    | High throughput, multiple consumers, event sourcing |
| Notion sync tasks          | RabbitMQ | Reliable delivery, retries, guaranteed processing   |
| Analytics                  | Kafka    | Event streaming, replay capability                  |
| Microservice communication | RabbitMQ | Request-reply patterns, task queues                 |

## Database Schema

```prisma
model WorkoutLog {
  id        String   @id @default(uuid())
  type      String
  sets      Int
  reps      Int
  weight    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  notionSyncStatus NotionSyncStatus?
}

model NotionSyncStatus {
  id           String   @id @default(uuid())
  workoutLogId String   @unique
  workoutLog   WorkoutLog @relation(...)
  notionPageId String?
  syncedAt     DateTime?
  failedAt     DateTime?
  errorMessage String?
  retryCount   Int      @default(0)
  status       SyncStatus @default(PENDING)
}

enum SyncStatus {
  PENDING
  SYNCED
  FAILED
  RETRYING
}
```

## Scalability Considerations

### Horizontal Scaling

- **PostgreSQL**: Read replicas for query scaling
- **Kafka**: Partition-based scaling (already configured with 3 partitions)
- **RabbitMQ**: Cluster mode for high availability
- **NestJS API**: Stateless, can scale horizontally with load balancer

### Performance Optimizations

- Database indexes on frequently queried fields
- Connection pooling (Prisma handles this)
- Message batching for Kafka producers
- RabbitMQ prefetch limits for consumer optimization

## Reliability Patterns

1. **Database Transactions**: ACID guarantees for data consistency
2. **Circuit Breakers**: Implemented in KafkaService
3. **Retry Logic**: RabbitMQ handles retries with exponential backoff
4. **Dead Letter Queues**: Failed messages can be routed to DLQ
5. **Health Checks**: All services have health check endpoints

## Security

- Environment-based configuration (no secrets in code)
- Database connection pooling
- Message broker authentication
- CORS configuration for API
- Input validation with DTOs

## Monitoring & Observability

- Correlation IDs for request tracing
- Structured logging with Winston
- Health check endpoints
- Database query logging (via Prisma)
- Message broker metrics (Kafka, RabbitMQ management UI)
