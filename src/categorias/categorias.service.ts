import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateCategoriaDto) {
    const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Categoria já existe');
    return this.prisma.category.create({ data: { name: dto.name } });
  }

  async remove(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new ConflictException('Categoria possui produtos vinculados e não pode ser removida');
    return this.prisma.category.delete({ where: { id } });
  }
}
