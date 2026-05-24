import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsEnum, Length } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class AjustarEstoqueDto {
  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ example: 5, description: 'Positivo para entrada, negativo para saída' })
  @IsInt()
  quantity: number;

  @ApiProperty({ example: 'Ajuste de inventário' })
  @IsString()
  @Length(3, 200)
  reason: string;
}
