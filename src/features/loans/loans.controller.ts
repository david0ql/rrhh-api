import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoanPaymentsQueryDto } from './dto/list-loan-payments-query.dto';
import { ListLoansQueryDto } from './dto/list-loans-query.dto';
import { LoansService } from './loans.service';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  listLoans(@Query() query: ListLoansQueryDto) {
    return this.loansService.listLoans(query);
  }

  @Get('payments')
  listPayments(@Query() query: ListLoanPaymentsQueryDto) {
    return this.loansService.listPayments(query);
  }

  @Post()
  createLoan(@Body() body: CreateLoanDto) {
    return this.loansService.createLoan(body);
  }

  @Post('payments')
  registerPayment(@Body() body: CreateLoanPaymentDto) {
    return this.loansService.registerPayment(body);
  }
}
