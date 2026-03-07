import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  LoanPaymentEntity,
  PayrollEntity,
} from '../../database/entities';
import { getSkip, toPaginatedResponse } from '../../shared/pagination';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import {
  ListLoanPaymentsQueryDto,
  LoanPaymentOrderBy,
} from './dto/list-loan-payments-query.dto';
import { ListLoansQueryDto, LoanOrderBy } from './dto/list-loans-query.dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly loansRepository: Repository<LoanEntity>,
    @InjectRepository(LoanPaymentEntity)
    private readonly loanPaymentsRepository: Repository<LoanPaymentEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeesRepository: Repository<EmployeeEntity>,
    @InjectRepository(PayrollEntity)
    private readonly payrollRepository: Repository<PayrollEntity>,
  ) {}

  async listLoans(query: ListLoansQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;

    const [raw, totalItems] = await this.loansRepository.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      relations: ['employee'],
      skip: getSkip(query.page, query.take),
      take: query.take,
      order: {
        [query.orderBy ?? LoanOrderBy.ID]: query.order,
      },
    });

    const data = raw.map(({ employee, ...loan }) => ({
      ...loan,
      employeeName: employee?.fullName ?? null,
    }));

    return toPaginatedResponse({
      data,
      page: query.page,
      take: query.take,
      totalItems,
      order: query.order,
      orderBy: query.orderBy,
    });
  }

  async listPayments(query: ListLoanPaymentsQueryDto) {
    const [data, totalItems] = await this.loanPaymentsRepository.findAndCount({
      skip: getSkip(query.page, query.take),
      take: query.take,
      order: {
        [query.orderBy ?? LoanPaymentOrderBy.ID]: query.order,
      },
    });

    return toPaginatedResponse({
      data,
      page: query.page,
      take: query.take,
      totalItems,
      order: query.order,
      orderBy: query.orderBy,
    });
  }

  async createLoan(payload: CreateLoanDto) {
    const employee = await this.employeesRepository.findOne({ where: { id: payload.employeeId } });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const entity = this.loansRepository.create({
      ...payload,
      suggestedInstallmentAmount: payload.suggestedInstallmentAmount ?? null,
      paidAmount: 0,
      balance: payload.principalAmount,
      status: 'ACTIVO',
    });

    return this.loansRepository.save(entity);
  }

  async registerPayment(payload: CreateLoanPaymentDto) {
    const loan = await this.loansRepository.findOne({ where: { id: payload.loanId } });
    if (!loan) {
      throw new NotFoundException('Prestamo no encontrado');
    }

    if (payload.payrollId) {
      const payroll = await this.payrollRepository.findOne({ where: { id: payload.payrollId } });
      if (!payroll) {
        throw new BadRequestException('payrollId no existe');
      }
    }

    const payment = this.loanPaymentsRepository.create({
      ...payload,
      source: payload.source ?? 'NOMINA',
      payrollId: payload.payrollId ?? null,
      notes: payload.notes ?? null,
    });

    const savedPayment = await this.loanPaymentsRepository.save(payment);

    loan.paidAmount += savedPayment.amount;
    loan.balance = Math.max(0, loan.principalAmount - loan.paidAmount);
    loan.status = loan.balance === 0 ? 'PAGADO' : 'ACTIVO';

    const updatedLoan = await this.loansRepository.save(loan);

    return {
      loan: updatedLoan,
      payment: savedPayment,
    };
  }
}
