import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  LoanPaymentEntity,
  MandatoryDeductionEntity,
  MandatoryEarningEntity,
  PayrollEntity,
} from '../../database/entities';
import { getSkip, toPaginatedResponse } from '../../shared/pagination';
import { buildPayrollPdfBuffer } from './payroll-pdf.builder';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { ListPayrollQueryDto, PayrollOrderBy } from './dto/list-payroll-query.dto';

const execFileAsync = promisify(execFile);

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollEntity)
    private readonly payrollRepository: Repository<PayrollEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeesRepository: Repository<EmployeeEntity>,
    @InjectRepository(LoanEntity)
    private readonly loansRepository: Repository<LoanEntity>,
    @InjectRepository(LoanPaymentEntity)
    private readonly loanPaymentsRepository: Repository<LoanPaymentEntity>,
    @InjectRepository(MandatoryDeductionEntity)
    private readonly mandatoryDeductionsRepository: Repository<MandatoryDeductionEntity>,
    @InjectRepository(MandatoryEarningEntity)
    private readonly mandatoryEarningsRepository: Repository<MandatoryEarningEntity>,
  ) {}

  async list(query: ListPayrollQueryDto) {
    const [raw, totalItems] = await this.payrollRepository.findAndCount({
      relations: ['employee'],
      skip: getSkip(query.page, query.take),
      take: query.take,
      order: {
        [query.orderBy ?? PayrollOrderBy.ID]: query.order,
      },
    });

    const data = raw.map(({ employee, ...record }) => ({
      ...record,
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

  async generatePdf(id: number): Promise<Buffer> {
    const payroll = await this.payrollRepository.findOne({
      where: { id },
      relations: ['employee'],
    });
    if (!payroll) throw new NotFoundException('Nómina no encontrada');
    return buildPayrollPdfBuffer(payroll);
  }

  async generateZip(payrollIds: number[]): Promise<Buffer> {
    const uniqueIds = [...new Set(payrollIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Debes enviar al menos una nómina');
    }

    const payrolls = await this.payrollRepository.find({
      where: { id: In(uniqueIds) },
      relations: ['employee'],
    });

    const payrollMap = new Map(payrolls.map((p) => [Number(p.id), p]));
    const missingIds = uniqueIds.filter((id) => !payrollMap.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`No existen nóminas: ${missingIds.join(', ')}`);
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'dally-rh-payroll-'));
    const zipPath = join(tempDir, 'nominas.zip');

    try {
      const fileNames: string[] = [];

      for (const id of uniqueIds) {
        const payroll = payrollMap.get(id)!;
        const pdf = await buildPayrollPdfBuffer(payroll);
        const safeEmployeeName = (payroll.employee?.fullName ?? 'empleado')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const fileName = `nomina-${id}-${safeEmployeeName || 'empleado'}.pdf`;
        await writeFile(join(tempDir, fileName), pdf);
        fileNames.push(fileName);
      }

      await execFileAsync('/usr/bin/zip', ['-j', '-q', zipPath, ...fileNames], {
        cwd: tempDir,
      });

      return await readFile(zipPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async create(payload: CreatePayrollDto) {
    if (payload.month < 1 || payload.month > 12) {
      throw new BadRequestException('month debe estar entre 1 y 12');
    }

    const employee = await this.employeesRepository.findOne({ where: { id: payload.employeeId } });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const existing = await this.payrollRepository.findOne({
      where: { employeeId: payload.employeeId, year: payload.year, month: payload.month },
    });
    if (existing) {
      throw new ConflictException('Ya existe nómina para ese empleado en ese mes');
    }

    const contributionBase = payload.earnedSalary + payload.earnedExtras;

    const mandatoryDeductions = await this.mandatoryDeductionsRepository.find({
      where: [{ code: 'SALUD', isActive: true }, { code: 'PENSION', isActive: true }],
    });
    const salud = mandatoryDeductions.find((d) => d.code === 'SALUD');
    const pension = mandatoryDeductions.find((d) => d.code === 'PENSION');
    if (!salud || !pension) {
      throw new BadRequestException('No están configuradas las deducciones obligatorias de salud y pensión');
    }

    const healthEmployeeRate = Number(salud.employeeRate);
    const healthEmployerRate = Number(salud.employerRate);
    const pensionEmployeeRate = Number(pension.employeeRate);
    const pensionEmployerRate = Number(pension.employerRate);

    const deductionHealth = this.roundMoney((contributionBase * healthEmployeeRate) / 100);
    const deductionPension = this.roundMoney((contributionBase * pensionEmployeeRate) / 100);

    const mandatoryEarnings = await this.mandatoryEarningsRepository.find({
      where: [
        { code: 'SALARIO_MINIMO_MENSUAL', isActive: true },
        { code: 'AUXILIO_TRANSPORTE_MENSUAL', isActive: true },
      ],
    });
    const minimumWageParam = mandatoryEarnings.find((e) => e.code === 'SALARIO_MINIMO_MENSUAL');
    const transportAllowanceParam = mandatoryEarnings.find(
      (e) => e.code === 'AUXILIO_TRANSPORTE_MENSUAL',
    );
    if (!minimumWageParam || !transportAllowanceParam) {
      throw new BadRequestException(
        'No están parametrizados SALARIO_MINIMO_MENSUAL y AUXILIO_TRANSPORTE_MENSUAL',
      );
    }

    const minimumWageMonthly = Number(minimumWageParam.monthlyAmount);
    const transportAllowanceMonthly = Number(transportAllowanceParam.monthlyAmount);
    const transportAllowanceDaily = this.roundAmount(transportAllowanceMonthly / 30, 6);
    const workedDaysForAllowance = Math.max(0, Math.min(30, Number(payload.daysWorked)));
    const transportAllowanceSalaryLimit = minimumWageMonthly * 2;
    const appliesTransportAllowance = Number(payload.earnedSalary) <= transportAllowanceSalaryLimit;
    const earnedTransportAllowance = appliesTransportAllowance
      ? this.roundMoney(transportAllowanceDaily * workedDaysForAllowance)
      : 0;
    const totalEarnings = contributionBase + earnedTransportAllowance;
    const totalDeductions =
      deductionHealth +
      deductionPension +
      payload.deductionLoan +
      payload.deductionOther;

    const entity = this.payrollRepository.create({
      ...payload,
      paymentDate: payload.paymentDate ?? null,
      earnedTransportAllowance,
      deductionHealth,
      deductionPension,
      healthEmployeeRate,
      healthEmployerRate,
      pensionEmployeeRate,
      pensionEmployerRate,
      transportAllowanceMonthly,
      transportAllowanceDaily,
      minimumWageMonthly,
      totalEarnings,
      totalDeductions,
      netPay: totalEarnings - totalDeductions,
    });

    let savedPayroll: PayrollEntity;
    try {
      savedPayroll = await this.payrollRepository.save(entity);
    } catch (error) {
      if (this.isDuplicatePayrollPeriodError(error)) {
        throw new ConflictException('Ya existe nómina para ese empleado en ese mes');
      }
      throw error;
    }

    // Registrar abono automático al préstamo si hay deducción
    if (payload.deductionLoan > 0) {
      let loan: LoanEntity | null = null;

      if (payload.loanId) {
        loan = await this.loansRepository.findOne({
          where: { id: payload.loanId, employeeId: payload.employeeId, status: 'ACTIVO' },
        });
      } else {
        loan = await this.loansRepository.findOne({
          where: { employeeId: payload.employeeId, status: 'ACTIVO' },
          order: { id: 'ASC' },
        });
      }

      if (loan) {
        const paymentDate =
          payload.paymentDate ?? new Date().toISOString().slice(0, 10);

        const payment = this.loanPaymentsRepository.create({
          loanId: loan.id,
          payrollId: savedPayroll.id,
          paymentDate,
          amount: payload.deductionLoan,
          source: 'NOMINA',
        });

        const savedPayment = await this.loanPaymentsRepository.save(payment);

        loan.paidAmount = Number(loan.paidAmount) + Number(savedPayment.amount);
        loan.balance = Math.max(0, Number(loan.principalAmount) - loan.paidAmount);
        loan.status = loan.balance === 0 ? 'PAGADO' : 'ACTIVO';
        await this.loansRepository.save(loan);
      }
    }

    return savedPayroll;
  }

  private isDuplicatePayrollPeriodError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (error as QueryFailedError & { driverError?: { code?: string; errno?: number } }).driverError;
    return driverError?.code === 'ER_DUP_ENTRY' || driverError?.errno === 1062;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundAmount(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
