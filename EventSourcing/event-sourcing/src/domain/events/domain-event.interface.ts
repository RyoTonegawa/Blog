export interface DomainEvent<TPayload = Record<string, any>> {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export const ORDER_AGGREGATE = 'Order';

export enum OrderEventType {
  OrderCreated = 'OrderCreated',
  OrderItemAdded = 'OrderItemAdded',
}

export type OrderEvent =
  | DomainEvent<{
      orderId: string;
      customerId: string;
    }>
  | DomainEvent<{
      orderId: string;
      sku: string;
      quantity: number;
    }>;

export interface StoredEvent extends DomainEvent {
  readonly version: number;
}
