import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParcelasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: number, status?: InstallmentStatus, clienteId?: number, vencimentoAte?: string) {
    if (!companyId) throw new BadRequestException('companyId ausente na requisição');
    return this.prisma.installment.findMany({
      where: {
        sale: clienteId ? { companyId, clientId: clienteId } : { companyId },
        ...(status && { status }),
        ...(vencimentoAte && { dueDate: { lte: new Date(vencimentoAte) } }),
      },
      include: {
        sale: {
          include: { client: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  pagar(id: number, companyId: number) {
    return this.prisma.$transaction(async (tx) => {
      const parcela = await tx.installment.findUnique({ where: { id } });
      if (!parcela) throw new NotFoundException('Parcela não encontrada');
      if (parcela.status === InstallmentStatus.PAID) {
        throw new ConflictException('Parcela já paga');
      }

      const saleCheck = await tx.sale.findUnique({ where: { id: parcela.saleId } });
      if (!saleCheck || saleCheck.companyId !== companyId) {
        throw new NotFoundException('Parcela não encontrada');
      }

      const parcelaAtualizada = await tx.installment.update({
        where: { id },
        data: {
          status: InstallmentStatus.PAID,
          paidAt: new Date(),
        },
      });

      const valorRestante = Number(saleCheck.remainingValue) - Number(parcela.value);
      if (valorRestante <= 0) {
        await tx.sale.update({
          where: { id: saleCheck.id },
          data: {
            status: SaleStatus.PAID,
            remainingValue: 0,
          },
        });
      } else {
        await tx.sale.update({
          where: { id: saleCheck.id },
          data: { remainingValue: valorRestante },
        });
      }

      return parcelaAtualizada;
    });
  }

  estornar(id: number, companyId: number) {
    return this.prisma.$transaction(async (tx) => {
      const parcela = await tx.installment.findUnique({ where: { id } });
      if (!parcela) throw new NotFoundException('Parcela não encontrada');
      if (parcela.status !== InstallmentStatus.PAID) {
        throw new ConflictException('Somente parcelas pagas podem ser estornadas');
      }

      const venda = await tx.sale.findUnique({ where: { id: parcela.saleId } });
      if (!venda || venda.companyId !== companyId) {
        throw new NotFoundException('Parcela não encontrada');
      }
      if (venda.status === SaleStatus.CANCELLED) {
        throw new ConflictException('Não é possível estornar parcela de venda cancelada');
      }

      const parcelaAtualizada = await tx.installment.update({
        where: { id },
        data: { status: InstallmentStatus.PENDING, paidAt: null },
      });

      const novoRestante = Number(venda.remainingValue) + Number(parcela.value);
      await tx.sale.update({
        where: { id: venda.id },
        data: {
          remainingValue: novoRestante,
          status: venda.status === SaleStatus.PAID ? SaleStatus.PENDING : venda.status,
        },
      });

      return parcelaAtualizada;
    });
  }
}
