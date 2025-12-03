require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'test-producer', brokers: [process.env.KAFKA_BROKER || 'localhost:29092'] });
const producer = kafka.producer();

async function run() {
    await producer.connect();
    await producer.send({
        topic: 'workout-logs',
        messages: [
            {
                value: JSON.stringify({ type: 'Bench Press', sets: 3, reps: 8, weight: 60 }),
                headers: { 'x-correlation-id': 'manual-test' }
            }
        ]
    });
    console.log('sent test message');
    await producer.disconnect();
}
run().catch(console.error);
