import { Controller, Get, Patch, Param, Query, ParseEnumPipe, ParseIntPipe, Req } from '@nestjs/common';
import { InstallmentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ParcelasService } from './parcelas.service';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

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
    @Req() req: { user: AuthUser },
    @Query('status', new ParseEnumPipe(InstallmentStatus, { optional: true })) status?: InstallmentStatus,
    @Query('clienteId', new ParseIntPipe({ optional: true })) clienteId?: number,
    @Query('vencimentoAte') vencimentoAte?: string,
  ) {
    return this.service.findAll(req.user.companyId, status, clienteId, vencimentoAte);
  }

  @Patch(':id/pagar')
  @ApiOperation({ summary: 'Registrar pagamento de parcela' })
  pagar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.pagar(id, req.user.companyId);
  }

  @Patch(':id/estornar')
  @ApiOperation({ summary: 'Estornar pagamento de parcela' })
  estornar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.estornar(id, req.user.companyId);
  }
}
