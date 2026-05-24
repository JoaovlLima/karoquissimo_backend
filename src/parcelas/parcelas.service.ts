import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParcelasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: InstallmentStatus, clienteId?: number, vencimentoAte?: string) {
    return this.prisma.installment.findMany({
      where: {
        ...(status && { status }),
        ...(vencimentoAte && { dueDate: { lte: new Date(vencimentoAte) } }),
        ...(clienteId && { sale: { clientId: clienteId } }),
      },
      include: {
        sale: {
          include: { client: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  pagar(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const parcela = await tx.installment.findUnique({ where: { id } });
      if (!parcela) throw new NotFoundException('Parcela não encontrada');
      if (parcela.status === InstallmentStatus.PAID) {
        throw new ConflictException('Parcela já paga');
      }

      const parcelaAtualizada = await tx.installment.update({
        where: { id },
        data: {
          status: InstallmentStatus.PAID,
          paidAt: new Date(),
        },
      });

      const venda = await tx.sale.findUnique({ where: { id: parcela.saleId } });
      if (!venda) throw new NotFoundException('Venda não encontrada');

      const valorRestante = Number(venda.remainingValue) - Number(parcela.value);
      if (valorRestante <= 0) {
        await tx.sale.update({
          where: { id: venda.id },
          data: {
            status: SaleStatus.PAID,
            remainingValue: 0,
          },
        });
      } else {
        await tx.sale.update({
          where: { id: venda.id },
          data: { remainingValue: valorRestante },
        });
      }

      return parcelaAtualizada;
    });
  }
}
