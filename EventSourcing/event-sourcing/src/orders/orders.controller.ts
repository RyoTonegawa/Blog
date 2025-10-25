import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Post(':orderId/items')
  addItem(
    @Param('orderId') orderId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(orderId, dto);
  }

  @Get(':orderId/summary')
  getSummary(@Param('orderId') orderId: string) {
    return this.ordersService.getSummary(orderId);
  }
}
