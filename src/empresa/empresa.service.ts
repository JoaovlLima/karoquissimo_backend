import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne() {
    const empresa = await this.prisma.company.findFirst();
    if (!empresa) throw new NotFoundException('Dados da empresa não encontrados');
    return empresa;
  }

  async update(dto: UpdateEmpresaDto) {
    const empresa = await this.findOne();
    return this.prisma.company.update({ where: { id: empresa.id }, data: dto });
  }
}
