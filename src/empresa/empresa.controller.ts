import { Controller, Get, Put, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Public } from '../auth/decorators/public.decorator';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Empresa')
@ApiBearerAuth()
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly service: EmpresaService) {}

  @Get()
  @ApiOperation({ summary: 'Dados da empresa autenticada' })
  findOne(@Req() req: { user: AuthUser }) {
    return this.service.findOne(req.user.companyId);
  }

  @Public()
  @Get(':id/publico')
  @ApiOperation({ summary: 'Dados públicos da empresa (sem autenticação)' })
  findPublico(@Param('id', ParseIntPipe) id: number) {
    return this.service.findPublico(id);
  }

  @Put()
  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  update(
    @Body() dto: UpdateEmpresaDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.update(req.user.companyId, dto);
  }
}
