# Kafka Topics & Event Schema

This document describes all Kafka topics used in LifeHub for event streaming and analytics.

## Topic Naming Convention

Topics follow the pattern: `{domain}.{action}` (e.g., `workout.created`, `mood.created`)

## Topics

### Health & Fitness

#### `workout.created`

- **Description**: Published when a workout is logged
- **Payload**:
  ```json
  {
    "id": "uuid",
    "type": "string",
    "sets": number,
    "reps": number,
    "weight": number,
    "createdAt": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

#### `mood.created`

- **Description**: Published when a mood entry is logged
- **Payload**:
  ```json
  {
    "id": "uuid",
    "rating": number (1-10),
    "tags": ["string"],
    "notes": "string (optional)",
    "createdAt": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

#### `meal.logged`

- **Description**: Published when a meal is logged
- **Payload**:
  ```json
  {
    "id": "uuid",
    "description": "string",
    "date": "YYYY-MM-DD",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "createdAt": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

### Productivity

#### `todo.added`

- **Description**: Published when a todo is added
- **Payload**:
  ```json
  {
    "todoId": "uuid",
    "date": "YYYY-MM-DD",
    "text": "string",
    "status": "pending",
    "correlationId": "string (optional)"
  }
  ```

#### `todo.status.updated`

- **Description**: Published when a todo status changes
- **Payload**:
  ```json
  {
    "todoId": "uuid",
    "date": "YYYY-MM-DD",
    "status": "pending|done|skipped",
    "correlationId": "string (optional)"
  }
  ```

#### `daily.summary.created`

- **Description**: Published when a daily summary is created
- **Payload**:
  ```json
  {
    "date": "YYYY-MM-DD",
    "summary": "string",
    "correlationId": "string (optional)"
  }
  ```

### Learning & Growth

#### `book.created`

- **Description**: Published when a book is added
- **Payload**:
  ```json
  {
    "id": "uuid",
    "title": "string",
    "author": "string (optional)",
    "status": "READING|COMPLETED|WISHLIST",
    "progress": number (0-100),
    "createdAt": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

#### `book.progress.updated`

- **Description**: Published when book progress is updated
- **Payload**:
  ```json
  {
    "id": "uuid",
    "progress": number (0-100),
    "status": "READING|COMPLETED|WISHLIST (optional)",
    "correlationId": "string (optional)"
  }
  ```

#### `book.rated`

- **Description**: Published when a book is rated
- **Payload**:
  ```json
  {
    "id": "uuid",
    "rating": number (1-5),
    "correlationId": "string (optional)"
  }
  ```

#### `reading.session.created`

- **Description**: Published when a reading session is logged
- **Payload**:
  ```json
  {
    "id": "uuid",
    "bookId": "uuid",
    "pages": number (optional),
    "minutes": number (optional),
    "date": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

#### `skill.created`

- **Description**: Published when a skill is created
- **Payload**:
  ```json
  {
    "id": "uuid",
    "name": "string",
    "proficiency": number (0-100),
    "createdAt": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

#### `skill.progress.updated`

- **Description**: Published when skill proficiency is updated
- **Payload**:
  ```json
  {
    "id": "uuid",
    "proficiency": number (0-100),
    "correlationId": "string (optional)"
  }
  ```

#### `self.test.created`

- **Description**: Published when a self-test is logged
- **Payload**:
  ```json
  {
    "id": "uuid",
    "skillId": "uuid",
    "score": number (0-100, optional),
    "date": "ISO8601",
    "correlationId": "string (optional)"
  }
  ```

## Consumer Groups

### `analytics-group`

- **Purpose**: Processes events for analytics and aggregations
- **Topics**: All topics listed above
- **Service**: `analytics-consumer`

### `notion-sync-group`

- **Purpose**: Syncs events to Notion
- **Topics**: `workout.created`, `mood.created`, `meal.logged`
- **Service**: `notion-consumer`

## Event Processing Flow

1. **API Gateway** receives request
2. **Outbox Pattern**: Event is written to PostgreSQL `outbox` table in same transaction
3. **Outbox Processor** (cron job every 5 seconds) publishes pending events to Kafka
4. **Kafka** distributes events to subscribed consumers
5. **Consumers** process events independently:
   - Analytics consumer → Updates Redis aggregations
   - Notion consumer → Syncs to Notion
   - Future: Search indexer, notification service, etc.

## Message Format

All Kafka messages follow this structure:

```json
{
  "eventId": "uuid",
  "type": "event.type",
  "payload": {
    /* domain-specific payload */
  },
  "createdAt": "ISO8601"
}
```

## Retention & Partitioning

- **Retention**: 7 days (configurable)
- **Partitions**: 3 partitions per topic (for parallel processing)
- **Replication**: 1 replica (for local development)

## Monitoring

- Check Kafka consumer lag: `kafka-consumer-groups.sh --bootstrap-server localhost:9094 --describe --group analytics-group`
- View topic messages: `kafka-console-consumer.sh --bootstrap-server localhost:9094 --topic workout.created --from-beginning`
