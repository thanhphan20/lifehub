# MVP Tasks for LifeHub

## 1. Kafka Setup

- [ ] Configure Kafka using Docker Compose (KRaft mode, no Zookeeper)
- [ ] Verify Kafka is running and accessible

## 2. API Gateway (NestJS)

- [ ] Scaffold NestJS project for API Gateway
- [ ] Implement workout logging endpoint (POST /log/workout)
- [ ] Validate workout log input (type, sets, reps, weight)
- [ ] Produce workout log messages to Kafka topic
- [ ] Add basic error handling and logging

## 3. Notion Consumer (Node.js)

- [ ] Scaffold Node.js project for Notion consumer
- [ ] Connect to Kafka and subscribe to workout log topic
- [ ] Parse and validate incoming workout log messages
- [ ] Persist workout logs to Notion database
- [ ] Add error handling and logging for Notion integration

## 4. Environment & Configuration

- [ ] Create and document .env.example files for both services
- [ ] Add Notion integration token and database ID to configuration

## 5. Testing & Verification

- [ ] Test end-to-end flow: API -> Kafka -> Notion
- [ ] Add a smoke test endpoint to API Gateway
- [ ] Document sample curl request for manual testing

## 6. Documentation

- [ ] Update README with setup and usage instructions
- [ ] Document Kafka topics and message format
- [ ] Add architecture diagram (optional)
