import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantEntity } from '../../database/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantGuard } from '../tenants/tenant.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentTenant() tenant: TenantEntity) {
    return this.dashboardService.summary(tenant.id);
  }
}
