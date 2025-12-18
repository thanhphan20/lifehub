# Analytics Consumer

Kafka consumer service that processes LifeHub events for analytics and aggregations.

## Overview

This service subscribes to all LifeHub event topics and:

- Aggregates daily/weekly metrics in Redis
- Calculates statistics (averages, totals, distributions)
- Prepares data for analytics dashboards
- Enables real-time analytics queries

## Setup

```bash
cd services/analytics-consumer
npm install
cp ENV.example .env
# Edit .env with your configuration
```

## Configuration

Environment variables (`.env`):

```env
KAFKA_BROKER=localhost:9094
DATABASE_URL=postgresql://lifehub:lifehub_password@localhost:5432/lifehub
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Watch Mode

```bash
npm run watch
```

## What It Does

### Event Processing

The consumer processes events from all LifeHub domains:

1. **Workout Events** → Tracks daily workout counts
2. **Mood Events** → Calculates mood averages and tag frequencies
3. **Nutrition Events** → Aggregates macro totals
4. **Todo Events** → Tracks completion rates
5. **Reading Events** → Tracks reading time and pages
6. **Learning Events** → Tracks skill progress and self-tests

### Data Storage

All analytics data is stored in Redis with keys like:

- `analytics:daily:YYYY-MM-DD:{metric}` - Daily metrics
- `analytics:books:{status}` - Book counts by status
- `analytics:skills:total` - Total skills tracked

### API Integration

The analytics data is exposed via the API Gateway's `/analytics` endpoints:

- `GET /analytics/daily?date=YYYY-MM-DD` - Daily summary
- `GET /analytics/weekly?week=YYYY-WW` - Weekly summary
- `GET /analytics/correlations?period=week` - Metric correlations

## Architecture

```
Kafka Topics → Analytics Consumer → Redis Aggregations → API Gateway → Frontend
```

## Monitoring

- Check consumer lag: `kafka-consumer-groups.sh --bootstrap-server localhost:9094 --describe --group analytics-group`
- View Redis keys: `redis-cli KEYS "analytics:*"`
- Check logs for processing errors

## Scaling

- Run multiple consumer instances with the same `groupId` for load balancing
- Each instance processes different partitions
- Redis aggregations are shared across instances
