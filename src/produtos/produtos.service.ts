import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(q?: string, categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  async create(dto: CreateProdutoDto) {
    const exists = await this.prisma.product.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Código de produto já cadastrado');
    const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.product.create({
      data: {
        code: dto.code,
        name: dto.name,
        categoryId: dto.categoryId,
        color: dto.color,
        size: dto.size,
        price: dto.price,
        units: dto.units,
        supplier: dto.supplier,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: number, dto: UpdateProdutoDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async ajustarEstoque(id: number, dto: AjustarEstoqueDto, userId: number) {
    const product = await this.findOne(id);
    const novasUnidades = Number(product.units) + dto.quantity;
    if (novasUnidades < 0) throw new BadRequestException('Estoque não pode ficar negativo');
    return this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { units: novasUnidades } }),
      this.prisma.stockMovement.create({
        data: {
          productId: id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          userId,
        },
      }),
    ]);
  }
}
