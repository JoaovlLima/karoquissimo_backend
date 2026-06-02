import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  companyId: number;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Resumo do dashboard' })
  getStats(@Req() req: { user: AuthUser }) {
    return this.service.getStats(req.user.companyId);
  }

  @Get('parcelas-proximas')
  @ApiOperation({ summary: 'Parcelas dos proximos 7 dias' })
  getParcelasProximos7Dias(@Req() req: { user: AuthUser }) {
    return this.service.getParcelasProximos7Dias(req.user.companyId);
  }

  @Get('estoque-baixo')
  @ApiOperation({ summary: 'Produtos com estoque baixo' })
  getProdutosEstoqueBaixo(@Req() req: { user: AuthUser }) {
    return this.service.getProdutosEstoqueBaixo(req.user.companyId);
  }
}
