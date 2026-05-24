import { IsString, IsOptional, IsEmail, Length } from 'class-validator';

export class UpdateEmpresaDto {
  @IsOptional() @IsString() corporateName?: string;
  @IsOptional() @IsString() tradeName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() @Length(2, 2) state?: string;
  @IsOptional() @IsString() zipCode?: string;
}
