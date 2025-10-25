import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { EventStoreService } from '../event-store/event-store.service';
import { PostgresService } from '../infrastructure/postgres.service';
import { KafkaService } from '../infrastructure/kafka.service';
import { OutboxService } from '../outbox/outbox.service';
import { OrderSummaryProjection } from '../projections/order-summary.projection';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    EventStoreService,
    PostgresService,
    KafkaService,
    OutboxService,
    OrderSummaryProjection,
  ],
})
export class OrdersModule {}
