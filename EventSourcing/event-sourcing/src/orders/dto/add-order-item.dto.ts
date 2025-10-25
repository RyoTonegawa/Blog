import { IsInt, IsPositive, IsString } from 'class-validator';

export class AddOrderItemDto {
  @IsString()
  sku!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
