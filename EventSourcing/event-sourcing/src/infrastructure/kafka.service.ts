import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Consumer,
  EachMessagePayload,
  Kafka,
  KafkaMessage,
  Producer,
} from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly kafka: Kafka;
  private producer?: Producer;
  private consumers: Consumer[] = [];
  private readonly logger = new Logger(KafkaService.name);

  constructor(configService: ConfigService) {
    const clientId =
      configService.get<string>('KAFKA_CLIENT_ID') ?? 'event-sourcing-sample';
    const brokers =
      configService
        .get<string>('KAFKA_BROKERS', 'localhost:9092')
        ?.split(',') ?? [];
    this.kafka = new Kafka({ clientId, brokers });
  }

  async onModuleDestroy() {
    await Promise.all([
      this.producer?.disconnect(),
      ...this.consumers.map((consumer) => consumer.disconnect()),
    ]);
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  async send(topic: string, messages: KafkaMessage[]) {
    const producer = await this.getProducer();
    await producer.send({ topic, messages });
  }

  async consume(
    topic: string,
    groupId: string,
    handler: (payload: EachMessagePayload) => Promise<void>,
  ) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    consumer
      .run({
        eachMessage: handler,
      })
      .catch((error) =>
        this.logger.error(`Kafka consumer error for ${topic}`, error),
      );
    this.consumers.push(consumer);
    this.logger.log(`Kafka consumer running for topic=${topic}`);
  }
}
