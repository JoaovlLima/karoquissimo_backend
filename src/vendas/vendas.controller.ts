import { Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VendasService } from './vendas.service';
import { CreateVendaDto } from './dto/create-venda.dto';

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
    @Query('clienteId', new ParseIntPipe({ optional: true })) clienteId?: number,
    @Query('status', new ParseEnumPipe(SaleStatus, { optional: true })) status?: SaleStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.findAll(clienteId, status, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar venda por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nova venda' })
  create(@Body() dto: CreateVendaDto, @Req() req: { user: { id: number } }) {
    return this.service.create(dto, req.user.id);
  }
}
