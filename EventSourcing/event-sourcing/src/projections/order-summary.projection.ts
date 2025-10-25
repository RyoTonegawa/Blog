import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../infrastructure/kafka.service';
import { OrderEventType } from '../domain/events/domain-event.interface';

interface OrderSummary {
  orderId: string;
  customerId: string;
  totalQuantity: number;
}

@Injectable()
export class OrderSummaryProjection implements OnModuleInit {
  private readonly logger = new Logger(OrderSummaryProjection.name);
  private readonly summaries = new Map<string, OrderSummary>();

  constructor(private readonly kafka: KafkaService) {}

  async onModuleInit() {
    await this.kafka.consume(
      'orders.events',
      'order-summary-projection',
      async ({ message }) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        this.apply(payload);
      },
    );
  }

  get(orderId: string): OrderSummary | undefined {
    return this.summaries.get(orderId);
  }

  private apply(event: any) {
    switch (event.eventType) {
      case OrderEventType.OrderCreated:
        this.summaries.set(event.payload.orderId, {
          orderId: event.payload.orderId,
          customerId: event.payload.customerId,
          totalQuantity: 0,
        });
        break;
      case OrderEventType.OrderItemAdded: {
        const current =
          this.summaries.get(event.payload.orderId) ??
          ({
            orderId: event.payload.orderId,
            customerId: 'unknown',
            totalQuantity: 0,
          } as OrderSummary);
        current.totalQuantity += event.payload.quantity;
        this.summaries.set(event.payload.orderId, current);
        break;
      }
      default:
        break;
    }
    this.logger.debug(
      `Projection updated for order ${event.payload.orderId}: ${JSON.stringify(
        this.summaries.get(event.payload.orderId),
      )}`,
    );
  }
}
