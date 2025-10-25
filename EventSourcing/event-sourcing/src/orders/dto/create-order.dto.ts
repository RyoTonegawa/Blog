import { IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  orderId!: string;

  @IsString()
  customerId!: string;
}
