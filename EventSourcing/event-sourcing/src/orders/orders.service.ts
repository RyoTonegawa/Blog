import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStoreService } from '../event-store/event-store.service';
import { OrderAggregate } from '../domain/order.aggregate';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { OrderSummaryProjection } from '../projections/order-summary.projection';

@Injectable()
export class OrdersService {
  constructor(
    private readonly eventStore: EventStoreService,
    private readonly projection: OrderSummaryProjection,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const order = new OrderAggregate();
    order.create(dto.orderId, dto.customerId);
    await this.eventStore.append(order);
    return { orderId: dto.orderId };
  }

  async addItem(orderId: string, dto: AddOrderItemDto) {
    const order = await this.rehydrate(orderId);
    order.addItem(dto.sku, dto.quantity);
    await this.eventStore.append(order);
    return { orderId };
  }

  async getSummary(orderId: string) {
    const summary = this.projection.get(orderId);
    if (!summary) {
      throw new NotFoundException('Summary not found (event not processed yet)');
    }
    return summary;
  }

  private async rehydrate(orderId: string): Promise<OrderAggregate> {
    const history = await this.eventStore.load(orderId);
    if (history.length === 0) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return OrderAggregate.rehydrate(history);
  }
}
