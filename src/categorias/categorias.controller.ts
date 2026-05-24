import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@ApiTags('Categorias')
@ApiBearerAuth()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as categorias' })
  findAll() { return this.service.findAll(); }

  @Post()
  @ApiOperation({ summary: 'Criar nova categoria' })
  create(@Body() dto: CreateCategoriaDto) { return this.service.create(dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
