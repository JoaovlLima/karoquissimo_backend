import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: number, q?: string) {
    if (!companyId) throw new BadRequestException('companyId ausente na requisição');
    return this.prisma.client.findMany({
      where: {
        companyId,
        isActive: true,
        ...(q ? { fullName: { contains: q } } : {}),
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: number, companyId?: number) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client || (companyId !== undefined && client.companyId !== companyId)) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  async create(companyId: number, dto: CreateClienteDto) {
    const exists = await this.prisma.client.findUnique({ where: { cpf: dto.cpf } });
    if (exists) throw new ConflictException('CPF já cadastrado');
    return this.prisma.client.create({
      data: {
        fullName: dto.fullName,
        cpf: dto.cpf,
        birthDate: new Date(dto.birthDate),
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        companyId,
      },
    });
  }

  async update(id: number, dto: UpdateClienteDto, companyId?: number) {
    await this.findOne(id, companyId);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(id: number, companyId?: number) {
    await this.findOne(id, companyId);
    return this.prisma.client.update({ where: { id }, data: { isActive: false } });
  }
}
