import { Body, Controller, Get, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { DownloadPayrollZipDto } from './dto/download-payroll-zip.dto';
import { ListPayrollQueryDto } from './dto/list-payroll-query.dto';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  list(@Query() query: ListPayrollQueryDto) {
    return this.payrollService.list(query);
  }

  @Post()
  create(@Body() body: CreatePayrollDto) {
    return this.payrollService.create(body);
  }

  @Post('pdf/zip')
  async zip(@Body() body: DownloadPayrollZipDto): Promise<StreamableFile> {
    const buffer = await this.payrollService.generateZip(body.payrollIds);
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="nominas.zip"`,
    });
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string): Promise<StreamableFile> {
    const buffer = await this.payrollService.generatePdf(Number(id));
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="nomina-${id}.pdf"`,
    });
  }
}
