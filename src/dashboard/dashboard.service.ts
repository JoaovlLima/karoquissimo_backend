import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalClientes,
      totalProdutos,
      vendasHoje,
      parcelasVencendoHoje,
      parcelasPendentes,
      produtosEstoqueBaixo,
    ] = await Promise.all([
      this.prisma.client.count({ where: { isActive: true } }),
      this.prisma.product.count(),
      this.prisma.sale.findMany({
        where: { createdAt: { gte: inicioDia, lt: fimDia } },
        select: { totalValue: true },
      }),
      this.prisma.installment.count({
        where: { dueDate: { gte: inicioDia, lt: fimDia }, status: 'PENDING' },
      }),
      this.prisma.installment.findMany({
        where: { status: 'PENDING' },
        select: { value: true },
      }),
      this.prisma.product.count({ where: { units: { lte: 3 } } }),
    ]);

    const faturamentoHoje = vendasHoje.reduce((acc, v) => acc + Number(v.totalValue), 0);
    const valorPendenteTotal = parcelasPendentes.reduce((acc, p) => acc + Number(p.value), 0);

    return {
      totalClientes,
      totalProdutos,
      vendasHoje: vendasHoje.length,
      faturamentoHoje,
      parcelasVencendoHoje,
      parcelasPendentes: parcelasPendentes.length,
      valorPendenteTotal,
      produtosEstoqueBaixo,
    };
  }

  getParcelasProximos7Dias() {
    const hoje = new Date();
    const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.installment.findMany({
      where: { dueDate: { gte: hoje, lte: em7dias }, status: 'PENDING' },
      include: {
        sale: {
          include: { client: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
  }

  getProdutosEstoqueBaixo() {
    return this.prisma.product.findMany({
      where: { units: { lte: 3 } },
      include: { category: { select: { name: true } } },
      orderBy: { units: 'asc' },
      take: 10,
    });
  }
}
