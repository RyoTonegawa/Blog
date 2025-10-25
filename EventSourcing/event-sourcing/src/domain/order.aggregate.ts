import {
  DomainEvent,
  OrderEventType,
  ORDER_AGGREGATE,
  StoredEvent,
} from './events/domain-event.interface';

export interface OrderState {
  orderId: string | null;
  customerId: string | null;
  items: Record<string, number>;
  version: number;
}

const initialState: OrderState = {
  orderId: null,
  customerId: null,
  items: {},
  version: 0,
};

export class OrderAggregate {
  private readonly changes: DomainEvent[] = [];
  private state: OrderState = { ...initialState };

  static rehydrate(events: StoredEvent[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    events.forEach((event) => aggregate.apply(event));
    aggregate.state.version = events.at(-1)?.version ?? 0;
    return aggregate;
  }

  get id(): string | null {
    return this.state.orderId;
  }

  get pendingEvents(): DomainEvent[] {
    return [...this.changes];
  }

  get orderState(): OrderState {
    return { ...this.state };
  }

  create(orderId: string, customerId: string): void {
    if (this.state.orderId) {
      throw new Error('Order already created');
    }
    this.recordEvent(OrderEventType.OrderCreated, {
      orderId,
      customerId,
    });
  }

  addItem(sku: string, quantity: number): void {
    if (!this.state.orderId) {
      throw new Error('Order must exist before adding items');
    }
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    this.recordEvent(OrderEventType.OrderItemAdded, {
      orderId: this.state.orderId,
      sku,
      quantity,
    });
  }

  clearPendingEvents(): void {
    this.changes.length = 0;
  }

  private recordEvent(eventType: OrderEventType, payload: Record<string, any>) {
    const event: DomainEvent = {
      aggregateId: payload.orderId,
      aggregateType: ORDER_AGGREGATE,
      eventType,
      occurredAt: new Date().toISOString(),
      payload,
    };
    this.apply(event);
    this.changes.push(event);
  }

  private apply(event: DomainEvent | StoredEvent) {
    switch (event.eventType) {
      case OrderEventType.OrderCreated: {
        this.state = {
          ...this.state,
          orderId: event.payload.orderId,
          customerId: event.payload.customerId,
        };
        break;
      }
      case OrderEventType.OrderItemAdded: {
        const current = this.state.items[event.payload.sku] ?? 0;
        this.state = {
          ...this.state,
          items: {
            ...this.state.items,
            [event.payload.sku]: current + event.payload.quantity,
          },
        };
        break;
      }
      default:
        break;
    }
  }
}
