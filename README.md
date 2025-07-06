# LifeHub - Kafka + NestJS + Notion Integration

LifeHub is a real-time logging system that allows you to track workouts (and other activities) through a NestJS API, push logs into Kafka, and then persist those logs into Notion via a Kafka consumer.

---

## 📁 Project Structure

```
lifehub/
├── kafka/                          # Kafka setup using Kraft (no Zookeeper)
├── services/
│   ├── api-gateway/               # NestJS API producer (log -> Kafka)
│   └── notion-consumer/           # Node.js Kafka consumer (logs -> Notion)
├── docker-compose.yml             # Kafka Docker setup
├── README.md
└── RULE.md
```

---

## 🚀 How to Run

### 1. Clone the repository

```bash
git clone https://github.com/yourname/lifehub.git
cd lifehub
```

### 2. Start Kafka via Docker

```bash
docker-compose up -d
```

### 3. Setup API Gateway (NestJS)

```bash
cd services/api-gateway
npm install
npm run start:dev
```

### 4. Setup Notion Consumer (Node.js)

```bash
cd ../notion-consumer
cp .env.example .env  # Add your Notion secrets
npm install
node index.js
```

### 5. Send Sample Request

```bash
curl -X POST http://localhost:3000/log/workout \
  -H "Content-Type: application/json" \
  -d '{"type":"Deadlift","sets":4,"reps":6,"weight":120}'
```

If setup correctly, the data should appear as a new row in your Notion database.

---

## 🧠 Requirements

- Docker + Docker Compose
- Node.js (>=16)
- NestJS CLI
- Notion Integration Token & Database ID

---

## ✨ Credits

Built by using NestJS, Kafka, and Notion.
