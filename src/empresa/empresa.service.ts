import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresaService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(companyId?: number) {
    const empresa = companyId
      ? await this.prisma.company.findUnique({ where: { id: companyId } })
      : await this.prisma.company.findFirst();
    if (!empresa) throw new NotFoundException('Dados da empresa não encontrados');
    return empresa;
  }

  // Retorna apenas os campos públicos de uma empresa (para o catálogo)
  async findPublico(id: number) {
    const empresa = await this.prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        tradeName: true,
        phone: true,
        whatsapp: true,
        email: true,
        city: true,
        state: true,
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  async update(companyId: number, dto: UpdateEmpresaDto) {
    await this.findOne(companyId);
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }
}
