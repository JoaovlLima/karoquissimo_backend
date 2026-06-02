import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, SaleStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendaDto } from './dto/create-venda.dto';

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: number, dto: CreateVendaDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: dto.clienteId } });
      if (!client || !client.isActive || client.companyId !== companyId) {
        throw new NotFoundException('Cliente nao encontrado ou inativo');
      }

      const products = await Promise.all(
        dto.itens.map(async (item) => {
          const product = await tx.product.findUnique({ where: { id: item.produtoId } });
          if (!product || product.companyId !== companyId) {
            throw new NotFoundException('Produto nao encontrado');
          }
          if (product.units < item.quantidade) {
            throw new BadRequestException(`Estoque insuficiente para o produto ${product.name}`);
          }
          return product;
        }),
      );

      const valorTotal = dto.itens.reduce(
        (total, item) => total + item.quantidade * item.valorUnitario,
        0,
      );
      const valorRestante = valorTotal - dto.valorEntrada;
      const documentNumber = `VND-${Date.now()}`;
      const status = dto.valorEntrada >= valorTotal ? SaleStatus.PAID : SaleStatus.PENDING;

      const sale = await tx.sale.create({
        data: {
          documentNumber,
          clientId: dto.clienteId,
          userId,
          companyId,
          totalValue: valorTotal,
          entryValue: dto.valorEntrada,
          remainingValue: Math.max(valorRestante, 0),
          status,
          observation: dto.observacao,
        },
      });

      // Cria itens e movimentacoes de estoque em paralelo
      await Promise.all([
        ...dto.itens.map((item) =>
          tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.produtoId,
              quantity: item.quantidade,
              unitPrice: item.valorUnitario,
              totalPrice: item.quantidade * item.valorUnitario,
            },
          }),
        ),
        ...dto.itens.map((item, index) =>
          tx.product.update({
            where: { id: item.produtoId },
            data: { units: products[index].units - item.quantidade },
          }),
        ),
        tx.stockMovement.createMany({
          data: dto.itens.map((item) => ({
            productId: item.produtoId,
            type: StockMovementType.OUT,
            quantity: -Math.abs(item.quantidade),
            reason: `Venda ${documentNumber}`,
            userId,
          })),
        }),
      ]);

      if (valorRestante <= 0) {
        await tx.installment.create({
          data: {
            saleId: sale.id,
            number: 1,
            value: valorTotal,
            dueDate: new Date(dto.dataVencimento1),
            paidAt: new Date(),
            status: InstallmentStatus.PAID,
          },
        });
      } else {
        const baseValue = Math.round((valorRestante / dto.numeroParcelas) * 100) / 100;
        let allocated = 0;
        const parcelasData = Array.from({ length: dto.numeroParcelas }, (_, index) => {
          const isLast = index === dto.numeroParcelas - 1;
          const value = isLast
            ? Math.round((valorRestante - allocated) * 100) / 100
            : baseValue;
          allocated += value;
          const dueDate = new Date(dto.dataVencimento1);
          dueDate.setMonth(dueDate.getMonth() + index);
          return { saleId: sale.id, number: index + 1, value, dueDate, status: InstallmentStatus.PENDING };
        });
        await tx.installment.createMany({ data: parcelasData });
      }

      // Retorna a venda com todas as relacoes sem fazer um findUnique extra
      return {
        ...sale,
        client: { id: client.id, fullName: client.fullName },
        user: { id: userId, name: '' },
        saleItems: dto.itens.map((item, i) => ({
          id: 0,
          saleId: sale.id,
          productId: item.produtoId,
          quantity: item.quantidade,
          unitPrice: item.valorUnitario,
          totalPrice: item.quantidade * item.valorUnitario,
          product: products[i],
        })),
      };
    }, { timeout: 30000, maxWait: 10000 });
  }

  findAll(companyId: number, clienteId?: number, status?: SaleStatus, page = 1, limit = 20) {
    if (!companyId) throw new BadRequestException('companyId ausente na requisicao');
    return this.prisma.sale.findMany({
      where: {
        companyId,
        ...(clienteId ? { clientId: clienteId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        client: { select: { id: true, fullName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: number, companyId?: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        user: true,
        saleItems: { include: { product: true } },
        installments: true,
      },
    });
    if (!sale || (companyId !== undefined && sale.companyId !== companyId)) {
      throw new NotFoundException('Venda nao encontrada');
    }
    return sale;
  }

  async cancelar(id: number, companyId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { saleItems: true },
      });
      if (!sale || sale.companyId !== companyId) {
        throw new NotFoundException('Venda nao encontrada');
      }
      if (sale.status === SaleStatus.CANCELLED) {
        throw new ConflictException('Venda ja cancelada');
      }
      if (sale.status === SaleStatus.PAID) {
        throw new ConflictException('Nao e possivel cancelar uma venda quitada');
      }

      await Promise.all([
        ...sale.saleItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { units: { increment: item.quantity } },
          }),
        ),
        tx.installment.deleteMany({
          where: { saleId: id, status: InstallmentStatus.PENDING },
        }),
      ]);

      return tx.sale.update({
        where: { id },
        data: { status: SaleStatus.CANCELLED, remainingValue: 0 },
        include: {
          client: { select: { id: true, fullName: true } },
          saleItems: { include: { product: true } },
          installments: true,
        },
      });
    }, { timeout: 15000, maxWait: 5000 });
  }
}
