# LifeHub - Hybrid Microservices Architecture

LifeHub is a real-time logging system that allows you to track workouts (and other activities) through a hybrid NestJS API gateway. It uses:

- **PostgreSQL + Prisma** for persistent storage (source of truth)
- **Kafka** for event streaming and high-throughput message processing
- **RabbitMQ** for reliable task processing with guaranteed delivery and retries
- **Notion** integration for external data synchronization

This architecture provides a robust, scalable solution with both HTTP REST API and microservices support.

---

## 📁 Project Structure

```
lifehub/
├── services/
│   ├── api-gateway/               # NestJS hybrid app (HTTP + microservices)
│   │   ├── prisma/                # Prisma schema and migrations
│   │   └── src/
│   │       ├── prisma/            # Prisma service and module
│   │       ├── kafka/             # Kafka integration
│   │       ├── rabbitmq/          # RabbitMQ integration
│   │       └── workout/           # Workout domain
│   └── notion-consumer/           # Node.js consumer (logs -> Notion)
├── docker-compose.yml             # Infrastructure setup (PostgreSQL, Kafka, RabbitMQ)
├── README.md
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js (>=18)
- npm or yarn

### Automated Setup (Recommended)

```bash
# Run the setup script
./setup.sh

# This will:
# 1. Start Kafka in Docker
# 2. Install dependencies for both services
# 3. Create .env files from examples
```

### Manual Setup

#### 1. Start Infrastructure Services

```bash
# Start PostgreSQL, Kafka, and RabbitMQ in Docker
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
# Check status with: docker-compose ps
# View logs with: docker-compose logs -f [service-name]
```

#### 2. Setup API Gateway

```bash
cd services/api-gateway

# Install dependencies
npm install

# Create .env file from example
cp ENV.example .env
# The defaults work for local development, but you can customize:
# DATABASE_URL=postgresql://lifehub:lifehub_password@localhost:5432/lifehub
# KAFKA_BROKER=localhost:9094
# RABBITMQ_URL=amqp://lifehub:lifehub_password@localhost:5672
# PORT=3000

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed

# Start the API Gateway
npm run start:dev
```

The API Gateway will be available at:

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Swagger Docs**: http://localhost:3000/api
- **RabbitMQ Management**: http://localhost:15672 (user: `lifehub`, pass: `lifehub_password`)

#### 3. Setup Notion Consumer

```bash
cd services/notion-cosumer

# Install dependencies
npm install

# Create .env file with your Notion credentials
cp ENV.example .env
# Edit .env with your credentials:
# KAFKA_BROKER=localhost:9094
# NOTION_TOKEN=your_notion_integration_token
# NOTION_DB_ID=your_notion_database_id

# Start the consumer
npm start
```

### 4. Test the System

```bash
# Create a workout log (saves to DB, publishes to Kafka & RabbitMQ)
curl -X POST http://localhost:3000/workouts \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Deadlift",
    "sets": 4,
    "reps": 6,
    "weight": 120
  }'

# Get all workout logs (from PostgreSQL)
curl http://localhost:3000/workouts?limit=10&offset=0

# Get a specific workout log
curl http://localhost:3000/workouts/{workout-id}

# Check health
curl http://localhost:3000/health
```

If setup correctly:

1. The workout log will be saved to PostgreSQL
2. An event will be published to Kafka (for analytics/indexing)
3. A task will be queued in RabbitMQ (for Notion sync with retries)
4. The data should appear in your Notion database via the consumer

---

## 🔧 Configuration

### Environment Variables

#### API Gateway (`services/api-gateway/.env`)

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://lifehub:lifehub_password@localhost:5432/lifehub?schema=public

# Kafka (event streaming)
KAFKA_BROKER=localhost:9094

# RabbitMQ (task processing)
RABBITMQ_URL=amqp://lifehub:lifehub_password@localhost:5672
```

#### Notion Consumer (`services/notion-cosumer/.env`)

```env
KAFKA_BROKER=localhost:9094
NOTION_TOKEN=your_notion_integration_token
NOTION_DB_ID=your_notion_database_id
```

### Message Broker Configuration

**Kafka** (Event Streaming):

- **Local Development**: Use `localhost:9094` (host-accessible port)
- **Docker Network**: Use `kafka:9092` (internal Docker network)
- Used for: High-throughput event streaming, analytics, multiple consumers

**RabbitMQ** (Task Processing):

- **Local Development**: Use `amqp://lifehub:lifehub_password@localhost:5672`
- **Docker Network**: Use `amqp://lifehub:lifehub_password@rabbitmq:5672`
- Used for: Reliable task processing, guaranteed delivery, retry mechanisms

### Architecture Strategy

- **PostgreSQL**: Source of truth for all workout logs
- **Kafka**: Event streaming for analytics, indexing, and multiple consumers (fire-and-forget style)
- **RabbitMQ**: Reliable task queue for Notion synchronization with retries and guaranteed delivery
- **Hybrid NestJS**: Supports both HTTP REST API and microservices (RabbitMQ) simultaneously

---

## 📝 Notion Database Schema

Your Notion database must have the following properties:

- **Name** (Title) - Workout type
- **Sets** (Number) - Number of sets
- **Reps** (Number) - Number of reps per set
- **Weight** (Number) - Weight in kg
- **Date** (Date) - Workout date

---

## 🧠 Requirements

- Docker + Docker Compose
- Node.js (>=18)
- Notion Integration Token & Database ID

---

## 🛠️ Development

### API Gateway Commands

```bash
cd services/api-gateway

# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm test

# Prisma Commands
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open Prisma Studio (DB GUI)
npm run prisma:seed        # Seed the database
```

### Notion Consumer Commands

```bash
cd services/notion-cosumer

# Start
npm start

# Development (with watch)
npm run dev
```

### Infrastructure Commands

```bash
# View logs for all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f kafka
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Check service status
docker-compose ps
```

### Database Management

```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U lifehub -d lifehub

# View database tables
\dt

# Exit psql
\q
```

---

## 🐛 Troubleshooting

### Kafka Connection Issues

1. Ensure Kafka is running: `docker-compose ps`
2. Check Kafka logs: `docker-compose logs kafka`
3. Verify broker address: Use `localhost:9094` for local access
4. Wait for Kafka to fully start (can take 30-60 seconds)

### Notion Integration Issues

1. Verify your Notion token is valid
2. Check database ID is correct
3. Ensure database schema matches required properties
4. Check consumer logs for error messages

### API Gateway Issues

1. Check if port 3000 is available
2. Verify Kafka broker is accessible
3. Check logs for connection errors
4. Ensure all dependencies are installed
5. Run Prisma migrations: `npm run prisma:migrate`
6. Generate Prisma Client: `npm run prisma:generate`

### Database Connection Issues

1. Ensure PostgreSQL is running: `docker-compose ps postgres`
2. Check PostgreSQL logs: `docker-compose logs postgres`
3. Verify DATABASE_URL in .env matches docker-compose.yml credentials
4. Run migrations: `npm run prisma:migrate`

### RabbitMQ Connection Issues

1. Ensure RabbitMQ is running: `docker-compose ps rabbitmq`
2. Check RabbitMQ logs: `docker-compose logs rabbitmq`
3. Access Management UI: http://localhost:15672
4. Verify RABBITMQ_URL in .env matches docker-compose.yml credentials

---

## ✨ Credits

Built with NestJS, Kafka, and Notion.
