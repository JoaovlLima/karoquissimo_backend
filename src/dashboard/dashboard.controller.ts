import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Resumo do dashboard' })
  getStats() {
    return this.service.getStats();
  }

  @Get('parcelas-proximas')
  @ApiOperation({ summary: 'Parcelas dos próximos 7 dias' })
  getParcelasProximos7Dias() {
    return this.service.getParcelasProximos7Dias();
  }

  @Get('estoque-baixo')
  @ApiOperation({ summary: 'Produtos com estoque baixo' })
  getProdutosEstoqueBaixo() {
    return this.service.getProdutosEstoqueBaixo();
  }
}
