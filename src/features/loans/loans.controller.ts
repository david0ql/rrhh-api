import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TenantEntity } from '../../database/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantGuard } from '../tenants/tenant.guard';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoanPaymentsQueryDto } from './dto/list-loan-payments-query.dto';
import { ListLoansQueryDto } from './dto/list-loans-query.dto';
import { LoansService } from './loans.service';

@Controller('loans')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  listLoans(
    @CurrentTenant() tenant: TenantEntity,
    @Query() query: ListLoansQueryDto,
  ) {
    return this.loansService.listLoans(query, tenant.id);
  }

  @Get('payments')
  listPayments(
    @CurrentTenant() tenant: TenantEntity,
    @Query() query: ListLoanPaymentsQueryDto,
  ) {
    return this.loansService.listPayments(query, tenant.id);
  }

  @Post()
  createLoan(
    @CurrentTenant() tenant: TenantEntity,
    @Body() body: CreateLoanDto,
  ) {
    return this.loansService.createLoan(body, tenant.id);
  }

  @Post('payments')
  registerPayment(
    @CurrentTenant() tenant: TenantEntity,
    @Body() body: CreateLoanPaymentDto,
  ) {
    return this.loansService.registerPayment(body, tenant.id);
  }
}
