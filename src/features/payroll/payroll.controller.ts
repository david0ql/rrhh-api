import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { TenantEntity } from '../../database/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantGuard } from '../tenants/tenant.guard';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { DownloadPayrollZipDto } from './dto/download-payroll-zip.dto';
import { ListPayrollQueryDto } from './dto/list-payroll-query.dto';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  list(
    @CurrentTenant() tenant: TenantEntity,
    @Query() query: ListPayrollQueryDto,
  ) {
    return this.payrollService.list(query, tenant.id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantEntity,
    @Body() body: CreatePayrollDto,
  ) {
    return this.payrollService.create(body, tenant.id);
  }

  @Post('pdf/zip')
  async zip(
    @CurrentTenant() tenant: TenantEntity,
    @Body() body: DownloadPayrollZipDto,
  ): Promise<StreamableFile> {
    const buffer = await this.payrollService.generateZip(
      body.payrollIds,
      tenant.id,
    );
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="nominas.zip"`,
    });
  }

  @Get(':id/pdf')
  async pdf(
    @CurrentTenant() tenant: TenantEntity,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const buffer = await this.payrollService.generatePdf(Number(id), tenant.id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="nomina-${id}.pdf"`,
    });
  }
}
