import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { OrderAggregate } from '../domain/order.aggregate';
import {
  DomainEvent,
  ORDER_AGGREGATE,
  StoredEvent,
} from '../domain/events/domain-event.interface';
import { PostgresService } from '../infrastructure/postgres.service';

@Injectable()
export class EventStoreService {
  constructor(private readonly postgres: PostgresService) {}

  async load(aggregateId: string): Promise<StoredEvent[]> {
    const result = await this.postgres.query<StoredEvent>(
      'SELECT aggregate_id as "aggregateId", aggregate_type as "aggregateType", version, event_type as "eventType", payload, occurred_at as "occurredAt" FROM events WHERE aggregate_id = $1 ORDER BY version ASC',
      [aggregateId],
    );
    return result.rows;
  }

  async append(aggregate: OrderAggregate): Promise<StoredEvent[]> {
    const pending = aggregate.pendingEvents;
    if (pending.length === 0 || !aggregate.id) {
      return [];
    }

    let stored: StoredEvent[] = [];
    await this.postgres.withTransaction(async (client) => {
      const currentVersion = await this.lockAggregate(
        aggregate.id as string,
        client,
      );
      const startVersion = currentVersion ?? 0;
      let nextVersion = startVersion;
      stored = await Promise.all(
        pending.map(async (event) => {
          nextVersion += 1;
          const persisted = await this.persistEvent(
            aggregate.id as string,
            nextVersion,
            event,
            client,
          );
          await this.insertOutbox(persisted, client);
          return persisted;
        }),
      );

      await this.upsertAggregateVersion(
        aggregate.id as string,
        nextVersion,
        client,
      );
    });

    aggregate.clearPendingEvents();
    return stored;
  }

  private async lockAggregate(
    aggregateId: string,
    client: PoolClient,
  ): Promise<number | null> {
    const result = await this.postgres.query<{ version: number }>(
      'SELECT version FROM aggregates WHERE aggregate_id = $1 FOR UPDATE',
      [aggregateId],
      client,
    );
    return result.rows[0]?.version ?? null;
  }

  private async upsertAggregateVersion(
    aggregateId: string,
    version: number,
    client: PoolClient,
  ) {
    const result = await this.postgres.query(
      'UPDATE aggregates SET version = $2 WHERE aggregate_id = $1',
      [aggregateId, version],
      client,
    );
    if (result.rowCount === 0) {
      await this.postgres.query(
        'INSERT INTO aggregates (aggregate_id, aggregate_type, version) VALUES ($1, $2, $3)',
        [aggregateId, ORDER_AGGREGATE, version],
        client,
      );
    }
  }

  private async persistEvent(
    aggregateId: string,
    version: number,
    event: DomainEvent,
    client: PoolClient,
  ): Promise<StoredEvent> {
    await this.postgres.query(
      `INSERT INTO events (aggregate_id, aggregate_type, version, event_type, payload, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        aggregateId,
        ORDER_AGGREGATE,
        version,
        event.eventType,
        event.payload,
        event.occurredAt,
      ],
      client,
    );

    return {
      ...event,
      version,
    };
  }

  private async insertOutbox(event: StoredEvent, client: PoolClient) {
    await this.postgres.query(
      `INSERT INTO outbox_messages
        (id, aggregate_id, aggregate_type, version, event_type, payload, occurred_at, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
      [
        randomUUID(),
        event.aggregateId,
        event.aggregateType,
        event.version,
        event.eventType,
        event.payload,
        event.occurredAt,
      ],
      client,
    );
  }
}
