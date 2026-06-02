import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VendasService } from './vendas.service';
import { CreateVendaDto } from './dto/create-venda.dto';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Vendas')
@ApiBearerAuth()
@Controller('vendas')
export class VendasController {
  constructor(private readonly service: VendasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vendas' })
  @ApiQuery({ name: 'clienteId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SaleStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req: { user: AuthUser },
    @Query('clienteId', new ParseIntPipe({ optional: true })) clienteId?: number,
    @Query('status', new ParseEnumPipe(SaleStatus, { optional: true })) status?: SaleStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.findAll(req.user.companyId, clienteId, status, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar venda por ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nova venda' })
  create(
    @Body() dto: CreateVendaDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.create(req.user.companyId, dto, req.user.id);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar venda (reverte estoque, remove parcelas pendentes)' })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.cancelar(id, req.user.companyId);
  }
}
