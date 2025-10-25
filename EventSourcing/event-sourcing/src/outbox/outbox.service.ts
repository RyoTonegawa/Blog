import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PostgresService } from '../infrastructure/postgres.service';
import { KafkaService } from '../infrastructure/kafka.service';

interface OutboxRow {
  id: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  eventType: string;
  payload: Record<string, any>;
  occurredAt: string;
}

const ORDERS_TOPIC = 'orders.events';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly postgres: PostgresService,
    private readonly kafka: KafkaService,
  ) {}

  async onModuleInit() {
    // 簡易的なポーリング。実システムでは Debezium や LISTEN/NOTIFY を使うのも有効。
    this.interval = setInterval(() => {
      this.flushBatch().catch((error) =>
        this.logger.error('Outbox flush failed', error),
      );
    }, 2000);
  }

  async onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async flushBatch(limit = 50): Promise<number> {
    let rows: OutboxRow[] = [];
    await this.postgres.withTransaction(async (client) => {
      const result = await this.postgres.query<OutboxRow>(
        `SELECT id,
                aggregate_id as "aggregateId",
                aggregate_type as "aggregateType",
                version,
                event_type as "eventType",
                payload,
                occurred_at as "occurredAt"
         FROM outbox_messages
         WHERE published = FALSE
         ORDER BY occurred_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1`,
        [limit],
        client,
      );
      rows = result.rows;
      if (rows.length === 0) return;

      await this.kafka.send(
        ORDERS_TOPIC,
        rows.map((row) => ({
          key: row.aggregateId,
          value: JSON.stringify({
            aggregateId: row.aggregateId,
            aggregateType: row.aggregateType,
            eventType: row.eventType,
            payload: row.payload,
            occurredAt: row.occurredAt,
            version: row.version,
          }),
        })),
      );

      const ids = rows.map((row) => row.id);
      await this.postgres.query(
        `UPDATE outbox_messages
         SET published = TRUE, published_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [ids],
        client,
      );
    });
    if (rows.length > 0) {
      this.logger.log(`Published ${rows.length} event(s) to Kafka`);
    }
    return rows.length;
  }
}
