import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, SaleStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendaDto } from './dto/create-venda.dto';

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVendaDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: dto.clienteId } });
      if (!client || !client.isActive) {
        throw new NotFoundException('Cliente não encontrado ou inativo');
      }

      const products = await Promise.all(
        dto.itens.map(async (item) => {
          const product = await tx.product.findUnique({ where: { id: item.produtoId } });
          if (!product) throw new NotFoundException('Produto não encontrado');
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
          totalValue: valorTotal,
          entryValue: dto.valorEntrada,
          remainingValue: Math.max(valorRestante, 0),
          status,
          observation: dto.observacao,
        },
      });

      await Promise.all(
        dto.itens.map((item) =>
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
      );

      await Promise.all(
        dto.itens.map((item, index) =>
          Promise.all([
            tx.product.update({
              where: { id: item.produtoId },
              data: { units: products[index].units - item.quantidade },
            }),
            tx.stockMovement.create({
              data: {
                productId: item.produtoId,
                type: StockMovementType.OUT,
                quantity: -Math.abs(item.quantidade),
                reason: `Venda ${documentNumber}`,
                userId,
              },
            }),
          ]),
        ),
      );

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

        for (let index = 0; index < dto.numeroParcelas; index += 1) {
          const isLast = index === dto.numeroParcelas - 1;
          const value = isLast
            ? Math.round((valorRestante - allocated) * 100) / 100
            : baseValue;
          allocated += value;

          const dueDate = new Date(dto.dataVencimento1);
          dueDate.setMonth(dueDate.getMonth() + index);

          await tx.installment.create({
            data: {
              saleId: sale.id,
              number: index + 1,
              value,
              dueDate,
              status: InstallmentStatus.PENDING,
            },
          });
        }
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          client: { select: { id: true, fullName: true } },
          user: { select: { id: true, name: true } },
          saleItems: { include: { product: true } },
          installments: true,
        },
      });
    });
  }

  findAll(clienteId?: number, status?: SaleStatus, page = 1, limit = 20) {
    return this.prisma.sale.findMany({
      where: {
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

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        user: true,
        saleItems: { include: { product: true } },
        installments: true,
      },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }
}
