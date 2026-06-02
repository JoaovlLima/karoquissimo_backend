import { Injectable, ConflictException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';

const BUCKET = 'produtos';

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get storageUrl(): string {
    return this.config.get<string>('SUPABASE_URL') + '/storage/v1/object';
  }

  private get serviceRoleKey(): string {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  private get authHeaders() {
    const key = this.serviceRoleKey;
    // Suporte a chaves no formato novo (sb_secret_...) e legado (eyJ...)
    return {
      Authorization: 'Bearer ' + key,
      apikey: key,
    };
  }

  findAll(companyId: number, q?: string, categoryId?: number) {
    if (!companyId) throw new BadRequestException('companyId ausente na requisição');
    return this.prisma.product.findMany({
      where: {
        companyId,
        ...(q ? { name: { contains: q } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  catalogoPublico(companyId: number, q?: string, categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        companyId,
        units: { gt: 0 },
        ...(q ? { name: { contains: q } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        color: true,
        size: true,
        price: true,
        units: true,
        photoUrl: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, companyId?: number) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!p || (companyId !== undefined && p.companyId !== companyId)) {
      throw new NotFoundException('Produto não encontrado');
    }
    return p;
  }

  async create(companyId: number, dto: CreateProdutoDto) {
    const exists = await this.prisma.product.findFirst({ where: { code: dto.code, companyId } });
    if (exists) throw new ConflictException('Codigo de produto ja cadastrado');
    const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Categoria nao encontrada');
    return this.prisma.product.create({
      data: {
        code: dto.code,
        name: dto.name,
        categoryId: dto.categoryId,
        color: dto.color,
        size: dto.size,
        price: dto.price,
        units: dto.units,
        supplier: dto.supplier,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
        photoUrl: dto.photoUrl ?? null,
        companyId,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: number, dto: UpdateProdutoDto, companyId?: number) {
    await this.findOne(id, companyId);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async remove(id: number, companyId: number): Promise<void> {
    const product = await this.findOne(id, companyId);

    const hasSales = await this.prisma.saleItem.count({ where: { productId: id } });
    if (hasSales > 0) {
      throw new ConflictException('Produto possui vendas associadas e não pode ser excluído');
    }

    if (product.photoUrl) {
      const fileName = product.photoUrl.split('/').pop();
      if (fileName) {
        await axios
          .delete(this.storageUrl + '/' + BUCKET + '/' + fileName, { headers: this.authHeaders })
          .catch(() => null);
      }
    }

    await this.prisma.$transaction([
      this.prisma.stockMovement.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
  }

  async uploadFoto(id: number, file: Express.Multer.File, companyId?: number) {
    const product = await this.findOne(id, companyId);

    const ext = (file.originalname.split('.').pop()) ?? 'jpg';
    const fileName = product.code + '-' + Date.now() + '.' + ext;

    // Remove foto antiga
    if (product.photoUrl) {
      const oldFileName = product.photoUrl.split('/').pop();
      if (oldFileName) {
        await axios
          .delete(this.storageUrl + '/' + BUCKET + '/' + oldFileName, { headers: this.authHeaders })
          .catch(() => null);
      }
    }

    // Upload via REST API do Supabase Storage
    try {
      await axios.post(
        this.storageUrl + '/' + BUCKET + '/' + fileName,
        file.buffer,
        {
          headers: {
            ...this.authHeaders,
            'Content-Type': file.mimetype,
            'x-upsert': 'true',
          },
          maxBodyLength: Infinity,
        },
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err.message;
      throw new InternalServerErrorException('Erro no upload para o Storage: ' + msg);
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const photoUrl = supabaseUrl + '/storage/v1/object/public/' + BUCKET + '/' + fileName;

    return this.prisma.product.update({
      where: { id },
      data: { photoUrl },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async ajustarEstoque(id: number, dto: AjustarEstoqueDto, userId: number, companyId?: number) {
    const product = await this.findOne(id, companyId);
    const novasUnidades = Number(product.units) + dto.quantity;
    if (novasUnidades < 0) throw new BadRequestException('Estoque nao pode ficar negativo');
    return this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { units: novasUnidades } }),
      this.prisma.stockMovement.create({
        data: {
          productId: id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          userId,
        },
      }),
    ]);
  }
}
