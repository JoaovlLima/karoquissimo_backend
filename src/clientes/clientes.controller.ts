import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes ativos' })
  @ApiQuery({ name: 'q', required: false })
  findAll(
    @Req() req: { user: AuthUser },
    @Query('q') q?: string,
  ) {
    return this.service.findAll(req.user.companyId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo cliente' })
  create(
    @Body() dto: CreateClienteDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.create(req.user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.update(id, dto, req.user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativar cliente (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.remove(id, req.user.companyId);
  }
}
