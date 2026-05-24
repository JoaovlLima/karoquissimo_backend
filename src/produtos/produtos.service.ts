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

  findAll(q?: string, categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  async create(dto: CreateProdutoDto) {
    const exists = await this.prisma.product.findUnique({ where: { code: dto.code } });
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
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: number, dto: UpdateProdutoDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async uploadFoto(id: number, file: Express.Multer.File) {
    const product = await this.findOne(id);

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

  async ajustarEstoque(id: number, dto: AjustarEstoqueDto, userId: number) {
    const product = await this.findOne(id);
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
