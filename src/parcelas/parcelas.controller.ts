import { Controller, Get, Patch, Param, Query, ParseEnumPipe, ParseIntPipe } from '@nestjs/common';
import { InstallmentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ParcelasService } from './parcelas.service';

@ApiTags('Parcelas')
@ApiBearerAuth()
@Controller('parcelas')
export class ParcelasController {
  constructor(private readonly service: ParcelasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar parcelas' })
  @ApiQuery({ name: 'status', required: false, enum: InstallmentStatus })
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  @ApiQuery({ name: 'vencimentoAte', required: false, type: String })
  findAll(
    @Query('status', new ParseEnumPipe(InstallmentStatus, { optional: true })) status?: InstallmentStatus,
    @Query('clienteId', new ParseIntPipe({ optional: true })) clienteId?: number,
    @Query('vencimentoAte') vencimentoAte?: string,
  ) {
    return this.service.findAll(status, clienteId, vencimentoAte);
  }

  @Patch(':id/pagar')
  @ApiOperation({ summary: 'Registrar pagamento de parcela' })
  pagar(@Param('id', ParseIntPipe) id: number) {
    return this.service.pagar(id);
  }
}
