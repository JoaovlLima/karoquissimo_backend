import {
  Controller, Get, Post, Put, Patch, Param, Body,
  Query, Req, ParseIntPipe, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';
import { Public } from '../auth/decorators/public.decorator';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Produtos')
@ApiBearerAuth()
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  findAll(
    @Req() req: { user: AuthUser },
    @Query('q') q?: string,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
  ) {
    return this.service.findAll(req.user.companyId, q, categoryId);
  }

  @Public()
  @Get('catalogo/:companyId')
  @ApiOperation({ summary: 'Catálogo público de produtos (sem autenticação)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  catalogoPublico(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('q') q?: string,
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
  ) {
    return this.service.catalogoPublico(companyId, q, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar produto' })
  create(
    @Body() dto: CreateProdutoDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.create(req.user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProdutoDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.update(id, dto, req.user.companyId);
  }

  @Patch(':id/estoque')
  @ApiOperation({ summary: 'Ajuste manual de estoque' })
  ajustarEstoque(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjustarEstoqueDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.ajustarEstoque(id, dto, req.user.id, req.user.companyId);
  }

  @Patch(':id/foto')
  @ApiOperation({ summary: 'Upload de foto do produto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { foto: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  async uploadFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: AuthUser },
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo maior que 5MB');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato invalido. Use JPG, PNG ou WEBP');
    }
    return this.service.uploadFoto(id, file, req.user.companyId);
  }
}
