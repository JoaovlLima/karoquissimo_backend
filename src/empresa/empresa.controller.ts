import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@ApiTags('Empresa')
@ApiBearerAuth()
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly service: EmpresaService) {}

  @Get()
  @ApiOperation({ summary: 'Dados da empresa' })
  findOne() { return this.service.findOne(); }

  @Put()
  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  update(@Body() dto: UpdateEmpresaDto) { return this.service.update(dto); }
}
