import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { UpdateLoanDto } from './dto/update-loan.dto';

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

  async listLoans(query: ListLoansQueryDto, tenantId: number) {
    const where: Record<string, unknown> = { tenantId };
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

    const data = raw.map((loan) => this.serializeLoan(loan));

    return toPaginatedResponse({
      data,
      page: query.page,
      take: query.take,
      totalItems,
      order: query.order,
      orderBy: query.orderBy,
    });
  }

  async listPayments(query: ListLoanPaymentsQueryDto, tenantId: number) {
    const [data, totalItems] = await this.loanPaymentsRepository.findAndCount({
      where: { tenantId },
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

  async createLoan(payload: CreateLoanDto, tenantId: number) {
    const employee = await this.employeesRepository.findOne({
      where: { id: payload.employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const entity = this.loansRepository.create({
      ...payload,
      tenantId,
      suggestedInstallmentAmount: payload.suggestedInstallmentAmount ?? null,
      paidAmount: 0,
      balance: payload.principalAmount,
      status: 'ACTIVO',
    });

    const savedLoan = await this.loansRepository.save(entity);
    return this.getLoan(savedLoan.id, tenantId);
  }

  async getLoan(id: number, tenantId: number) {
    const loan = await this.findLoanOrFail(id, tenantId, ['employee']);
    return this.serializeLoan(loan);
  }

  async updateLoan(id: number, payload: UpdateLoanDto, tenantId: number) {
    const loan = await this.findLoanOrFail(id, tenantId);

    if (
      payload.employeeId !== undefined &&
      Number(payload.employeeId) !== Number(loan.employeeId)
    ) {
      if (Number(loan.paidAmount) > 0) {
        throw new BadRequestException(
          'No puedes cambiar el empleado de un préstamo con abonos registrados',
        );
      }

      const employee = await this.employeesRepository.findOne({
        where: { id: payload.employeeId, tenantId },
      });
      if (!employee) {
        throw new NotFoundException('Empleado no encontrado');
      }

      loan.employeeId = payload.employeeId;
    }

    if (payload.startDate !== undefined) {
      loan.startDate = payload.startDate;
    }

    if (payload.principalAmount !== undefined) {
      if (Number(payload.principalAmount) < Number(loan.paidAmount)) {
        throw new BadRequestException(
          'El capital no puede ser menor a lo ya abonado',
        );
      }

      loan.principalAmount = payload.principalAmount;
    }

    if (payload.suggestedInstallmentAmount !== undefined) {
      loan.suggestedInstallmentAmount =
        Number(payload.suggestedInstallmentAmount) > 0
          ? payload.suggestedInstallmentAmount
          : null;
    }

    if (payload.notes !== undefined) {
      loan.notes = payload.notes.trim() ? payload.notes.trim() : null;
    }

    loan.balance = Math.max(
      0,
      Number(loan.principalAmount) - Number(loan.paidAmount),
    );

    if (loan.status !== 'CANCELADO') {
      loan.status = loan.balance === 0 ? 'PAGADO' : 'ACTIVO';
    }

    await this.loansRepository.save(loan);

    return this.getLoan(loan.id, tenantId);
  }

  async registerPayment(payload: CreateLoanPaymentDto, tenantId: number) {
    const loan = await this.loansRepository.findOne({
      where: { id: payload.loanId, tenantId },
    });
    if (!loan) {
      throw new NotFoundException('Prestamo no encontrado');
    }

    if (payload.payrollId) {
      const payroll = await this.payrollRepository.findOne({
        where: { id: payload.payrollId, tenantId },
      });
      if (!payroll) {
        throw new BadRequestException('payrollId no existe');
      }
    }

    const payment = this.loanPaymentsRepository.create({
      ...payload,
      tenantId,
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

  private async findLoanOrFail(
    id: number,
    tenantId: number,
    relations: string[] = [],
  ) {
    const loan = await this.loansRepository.findOne({
      where: { id, tenantId },
      relations,
    });
    if (!loan) {
      throw new NotFoundException('Prestamo no encontrado');
    }
    return loan;
  }

  private serializeLoan(loan: LoanEntity) {
    const { employee, payments, tenant, statusRef, ...record } = loan;
    void payments;
    void tenant;
    void statusRef;

    return {
      ...record,
      employeeName: employee?.fullName ?? null,
    };
  }
}
