# LifeHub Architecture Diagrams

This document provides visual representations of the LifeHub ecosystem using **Mermaid.js**. These diagrams reflect the **Choreography SAGA** pattern and the distributed worker model.

---

## 1. System Overview (Landscape)

```mermaid
graph LR
    User((User)) -->|HTTPS| Gateway[API Gateway]
    Gateway -->|Ingest Event| Kafka((Kafka Broker))
    
    subgraph "Workers (The SAGA Team)"
        WorkerI[Integration Worker]
        WorkerN[Notion Worker]
        WorkerA[Analytics Worker]
    end

    Kafka -->|raw.ingest| WorkerI
    WorkerI -->|v1.enriched.logged| Kafka
    Kafka -->|v1.enriched.logged| WorkerN
    Kafka -->|v1.enriched.logged| WorkerA

    subgraph "Persistence & State"
        DB[(PostgreSQL)]
        Redis[(Redis Idempotency)]
    end

    Gateway --> DB
    WorkerI --> Redis
    WorkerN --> Redis
    WorkerA --> Redis
    WorkerA --> DB
    
    subgraph "External Ecosystem"
        Ninja[API Ninjas]
        Notion[Notion API]
    end
    
    WorkerI --> Ninja
    WorkerN --> Notion
```

---

## 2. Record Lifecycle (State Transition)

This diagram tracks how a tracking record moves through the system's decoupled states.

```mermaid
stateDiagram-v2
    [*] --> IngestionPending: User Request
    IngestionPending --> EnrichmentInProgress: raw.ingest emitted
    
    state EnrichmentInProgress {
        [*] --> CallingAPI: Worker Picked Up
        CallingAPI --> Success: 200 OK
        CallingAPI --> Failed: Max Retries
    }

    EnrichmentInProgress --> Enriched: enriched.logged emitted
    EnrichmentInProgress --> DeadLetterQueue: Enrichment Failed
    
    Enriched --> Syncing: Workers triggered
    
    state Syncing {
        [*] --> NotionSync
        [*] --> AnalyticsSync
        NotionSync --> NotionDone: sync_completed
        AnalyticsSync --> AnalyticsDone: sync_completed
    }

    NotionDone --> [*]
    AnalyticsDone --> [*]
```

---

## 3. SAGA Choreography Flow (Sequence)

Including the **Error Paths** and **Feedback Loop**.

```mermaid
sequenceDiagram
    participant U as User
    participant G as API Gateway
    participant K as Kafka
    participant W as Integration Worker
    participant N as Notion Worker
    participant A as Analytics Worker

    U->>G: POST /v1/ingest/unified (raw text)
    G->>G: Save record (PENDING)
    G->>K: Publish v1.nutrition.raw.ingest
    G-->>U: 202 Accepted (Correlation ID)

    Note over K,W: Enrichment Phase
    K->>W: Consume raw.ingest
    alt Success
        W->>W: Enrichment Logic
        W->>K: Publish v1.nutrition.enriched.logged
    else Failure (Max Retries)
        W->>K: Publish v1.error.enrichment_failed
    end

    Note over K,N: Sync Phase
    K->>N: Consume enriched.logged
    alt Notion Success
        N->>N: Sync to Notion
        N->>K: Publish ACK: v1.notion.sync_completed
    else Notion Failed
        N->>K: Publish ACK: v1.notion.sync_failed
    end

    Note over K,G: Portal Feedback
    K->>G: Consume sync_completed/failed
    G->>G: Update DB syncDetails
```

---

## 4. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    WorkoutLog {
        string id PK
        string correlationId UK
        string type "WORKOUT | NUTRITION"
        string rawText
        string enrichmentStatus "PENDING | COMPLETED | FAILED"
        json syncDetails "Record of service outcomes"
        datetime createdAt
    }

    StravaToken {
        int id PK
        string accessToken
        string refreshToken
        int expiresAt
    }
```

---

## 5. Resilience & Idempotency Logic

```mermaid
flowchart TD
    Msg[Message Received] --> Lock{Redis NX Lock?}
    Lock -->|No| Skip[Skip Processing]
    Lock -->|Yes| Process[Primary Action]
    Process --> Success{Success?}
    Success -->|Yes| PublishACK[Publish ACK Event]
    Success -->|No| Retry[Retry with Exponential Backoff]
    Retry --> Max{Max Retries?}
    Max -->|Yes| DLQ[Move to Dead Letter Queue]
    Max -->|No| Backoff[Wait & Re-queue]
```

---

> [!TIP]
> All diagrams are maintained in **Mermaid.js**. You can preview them directly in GitHub or use the [Mermaid Live Editor](https://mermaid.live/).
