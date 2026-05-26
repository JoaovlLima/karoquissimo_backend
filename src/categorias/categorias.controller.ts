import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { Public } from '../auth/decorators/public.decorator';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Categorias')
@ApiBearerAuth()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as categorias' })
  findAll(@Req() req: { user: AuthUser }) {
    return this.service.findAll(req.user.companyId);
  }

  @Public()
  @Get('publico/:companyId')
  @ApiOperation({ summary: 'Listar categorias públicas por empresa' })
  listarPublico(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova categoria' })
  create(
    @Body() dto: CreateCategoriaDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.create(req.user.companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.remove(id, req.user.companyId);
  }
}
