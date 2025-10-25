import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult } from 'pg';

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString:
        this.configService.get<string>('DATABASE_URL') ??
        'postgres://postgres:postgres@localhost:5432/event_sourcing',
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T = any>(
    text: string,
    params?: any[],
    client?: PoolClient,
  ): Promise<QueryResult<T>> {
    if (client) {
      return client.query(text, params);
    }
    return this.pool.query(text, params);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
