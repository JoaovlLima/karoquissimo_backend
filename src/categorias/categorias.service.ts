import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: number) {
    return this.prisma.category.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async create(companyId: number, dto: CreateCategoriaDto) {
    const exists = await this.prisma.category.findFirst({
      where: { name: dto.name, companyId },
    });
    if (exists) throw new ConflictException('Categoria já existe');
    return this.prisma.category.create({ data: { name: dto.name, companyId } });
  }

  async remove(id: number, companyId?: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat || (companyId !== undefined && cat.companyId !== companyId)) {
      throw new NotFoundException('Categoria não encontrada');
    }
    const count = await this.prisma.product.count({ where: { categoryId: id, companyId } });
    if (count > 0) throw new ConflictException('Categoria possui produtos vinculados e não pode ser removida');
    return this.prisma.category.delete({ where: { id } });
  }
}
