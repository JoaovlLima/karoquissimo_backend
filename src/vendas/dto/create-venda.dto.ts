import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsArray, IsOptional, IsString, IsDateString, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemVendaDto {
  @ApiProperty() @IsInt() @Min(1) produtoId: number;
  @ApiProperty() @IsInt() @Min(1) quantidade: number;
  @ApiProperty() @IsNumber() @Min(0.01) valorUnitario: number;
}

export class CreateVendaDto {
  @ApiProperty() @IsInt() @Min(1) clienteId: number;

  @ApiProperty({ type: [ItemVendaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens: ItemVendaDto[];

  @ApiProperty() @IsNumber() @Min(0) valorEntrada: number;
  @ApiProperty() @IsInt() @Min(1) numeroParcelas: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  dataVencimento1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacao?: string;
}
