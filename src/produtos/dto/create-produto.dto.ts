import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional, IsDateString, IsUrl, Min, Length } from 'class-validator';

export class CreateProdutoDto {
  @ApiProperty({ example: 'CAL-001' })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiProperty({ example: 'Tenis Esportivo' })
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({ example: 'Branco' })
  @IsString()
  color: string;

  @ApiProperty({ example: '39' })
  @IsString()
  size: string;

  @ApiProperty({ example: 129.90 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  units: number;

  @ApiProperty({ example: 'Fornecedor ABC' })
  @IsString()
  supplier: string;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}
