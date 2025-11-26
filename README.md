# LifeHub - Kafka + NestJS + Notion Integration

LifeHub is a real-time logging system that allows you to track workouts (and other activities) through a NestJS API, push logs into Kafka, and then persist those logs into Notion via a Kafka consumer.

---

## 📁 Project Structure

```
lifehub/
├── services/
│   ├── api-gateway/               # NestJS API producer (log -> Kafka)
│   └── notion-consumer/            # Node.js Kafka consumer (logs -> Notion)
├── docker-compose.yml             # Kafka Docker setup
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

#### 1. Start Kafka

```bash
# Start Kafka in Docker
docker-compose up -d

# Wait for Kafka to be ready (about 30 seconds)
# You can check logs with: docker-compose logs -f kafka
```

#### 2. Setup API Gateway

```bash
cd services/api-gateway

# Install dependencies
npm install

# Create .env file (optional, defaults work for local development)
cp ENV.example .env
# Edit .env if needed:
# KAFKA_BROKER=localhost:9094
# PORT=3000

# Start the API Gateway
npm run start:dev
```

The API Gateway will be available at:

- API: http://localhost:3000
- Health Check: http://localhost:3000/health
- Swagger Docs: http://localhost:3000/api

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
# Send a workout log
curl -X POST http://localhost:3000/log/workout \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Deadlift",
    "sets": 4,
    "reps": 6,
    "weight": 120
  }'

# Check health
curl http://localhost:3000/health
```

If setup correctly, the data should appear as a new row in your Notion database.

---

## 🔧 Configuration

### Environment Variables

#### API Gateway (`services/api-gateway/.env`)

```env
KAFKA_BROKER=localhost:9094
PORT=3000
```

#### Notion Consumer (`services/notion-cosumer/.env`)

```env
KAFKA_BROKER=localhost:9094
NOTION_TOKEN=your_notion_integration_token
NOTION_DB_ID=your_notion_database_id
```

### Kafka Broker Address

- **Local Development**: Use `localhost:9094` (host-accessible port)
- **Docker Network**: Use `kafka:9092` (internal Docker network)

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
```

### Notion Consumer Commands

```bash
cd services/notion-cosumer

# Start
npm start

# Development (with watch)
npm run dev
```

### Kafka Commands

```bash
# View logs
docker-compose logs -f kafka

# Stop Kafka
docker-compose down

# Stop and remove volumes
docker-compose down -v
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

---

## ✨ Credits

Built with NestJS, Kafka, and Notion.
