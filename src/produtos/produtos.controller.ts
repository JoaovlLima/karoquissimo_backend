import { Controller, Get, Post, Put, Patch, Param, Body, Query, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';

@ApiTags('Produtos')
@ApiBearerAuth()
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  findAll(@Query('q') q?: string, @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number) {
    return this.service.findAll(q, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Cadastrar produto' })
  create(@Body() dto: CreateProdutoDto) { return this.service.create(dto); }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProdutoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/estoque')
  @ApiOperation({ summary: 'Ajuste manual de estoque' })
  ajustarEstoque(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjustarEstoqueDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.service.ajustarEstoque(id, dto, req.user.id);
  }
}
