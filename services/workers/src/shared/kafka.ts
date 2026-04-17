import { Kafka, Consumer, Producer } from "kafkajs";

const kafka = new Kafka({
  clientId: "lifehub-workers",
  brokers: [process.env.KAFKA_BROKER || "localhost:29092"],
});

export const createConsumer = (groupId: string): Consumer => {
  return kafka.consumer({ groupId });
};

export const createProducer = (): Producer => {
  return kafka.producer();
};

export default kafka;
