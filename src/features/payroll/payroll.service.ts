import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import {
  ListPayrollQueryDto,
  PayrollOrderBy,
} from './dto/list-payroll-query.dto';
import { SendPayrollEmailDto } from './dto/send-payroll-email.dto';

const execFileAsync = promisify(execFile);
const EMAIL_SERVICE_URL =
  process.env.EMAIL_SERVICE_URL ??
  'https://email.amovil.co:42281/api/send-email';
const EMAIL_SERVICE_TOKEN =
  process.env.EMAIL_SERVICE_TOKEN ??
  'y6QvQ8n8XZHSZ75awunVR9zU2HGfQyrFeMHK3gqGTeVgfAMHkz';
const EMAIL_SERVICE_NB_TIPO = Number(process.env.EMAIL_SERVICE_NB_TIPO ?? '1');
const EMAIL_SERVICE_NB_EMPRESA = Number(
  process.env.EMAIL_SERVICE_NB_EMPRESA ?? '1',
);

type PayrollEmailDispatchResult = {
  attempted: boolean;
  sent: boolean;
  destination: string | null;
  error?: string;
};

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

  async list(query: ListPayrollQueryDto, tenantId: number) {
    const [raw, totalItems] = await this.payrollRepository.findAndCount({
      where: { tenantId },
      relations: ['employee'],
      skip: getSkip(query.page, query.take),
      take: query.take,
      order: {
        [query.orderBy ?? PayrollOrderBy.ID]: query.order,
      },
    });

    const data = raw.map((record) => this.serializePayroll(record));

    return toPaginatedResponse({
      data,
      page: query.page,
      take: query.take,
      totalItems,
      order: query.order,
      orderBy: query.orderBy,
    });
  }

  async getPayrollConfig() {
    return this.loadPayrollConfig();
  }

  async generatePdf(id: number, tenantId: number): Promise<Buffer> {
    const payroll = await this.findPayrollOrFail(id, tenantId, [
      'employee',
      'tenant',
    ]);
    return buildPayrollPdfBuffer(payroll, payroll.tenant);
  }

  async generateZip(payrollIds: number[], tenantId: number): Promise<Buffer> {
    const uniqueIds = [...new Set(payrollIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Debes enviar al menos una nómina');
    }

    const payrolls = await this.payrollRepository.find({
      where: { id: In(uniqueIds), tenantId },
      relations: ['employee', 'tenant'],
    });

    const payrollMap = new Map(payrolls.map((p) => [Number(p.id), p]));
    const missingIds = uniqueIds.filter((id) => !payrollMap.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `No existen nóminas: ${missingIds.join(', ')}`,
      );
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'dally-rh-payroll-'));
    const zipPath = join(tempDir, 'nominas.zip');

    try {
      const fileNames: string[] = [];

      for (const id of uniqueIds) {
        const payroll = payrollMap.get(id)!;
        const pdf = await buildPayrollPdfBuffer(payroll, payroll.tenant);
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

  async create(payload: CreatePayrollDto, tenantId: number) {
    if (payload.month < 1 || payload.month > 12) {
      throw new BadRequestException('month debe estar entre 1 y 12');
    }

    const employee = await this.employeesRepository.findOne({
      where: { id: payload.employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const existing = await this.payrollRepository.findOne({
      where: {
        tenantId,
        employeeId: payload.employeeId,
        year: payload.year,
        month: payload.month,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe nómina para ese empleado en ese mes',
      );
    }

    const contributionBase = payload.earnedSalary + payload.earnedExtras;

    const mandatoryDeductions = await this.mandatoryDeductionsRepository.find({
      where: [
        { code: 'SALUD', isActive: true },
        { code: 'PENSION', isActive: true },
      ],
    });
    const salud = mandatoryDeductions.find((d) => d.code === 'SALUD');
    const pension = mandatoryDeductions.find((d) => d.code === 'PENSION');
    if (!salud || !pension) {
      throw new BadRequestException(
        'No están configuradas las deducciones obligatorias de salud y pensión',
      );
    }

    const healthEmployeeRate = Number(salud.employeeRate);
    const healthEmployerRate = Number(salud.employerRate);
    const pensionEmployeeRate = Number(pension.employeeRate);
    const pensionEmployerRate = Number(pension.employerRate);

    const deductionHealth = this.roundMoney(
      (contributionBase * healthEmployeeRate) / 100,
    );
    const deductionPension = this.roundMoney(
      (contributionBase * pensionEmployeeRate) / 100,
    );

    const {
      minimumWageMonthly,
      transportAllowanceMonthly,
      transportAllowanceDaily,
      transportAllowanceSalaryLimit,
    } = await this.loadPayrollConfig();
    const workedDaysForAllowance = Math.max(
      0,
      Math.min(30, Number(payload.daysWorked)),
    );
    const appliesTransportAllowance =
      Number(payload.earnedSalary) <= transportAllowanceSalaryLimit;
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
      tenantId,
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
        throw new ConflictException(
          'Ya existe nómina para ese empleado en ese mes',
        );
      }
      throw error;
    }

    // Registrar abono automático al préstamo si hay deducción
    if (payload.deductionLoan > 0) {
      let loan: LoanEntity | null = null;

      if (payload.loanId) {
        loan = await this.loansRepository.findOne({
          where: {
            id: payload.loanId,
            tenantId,
            employeeId: payload.employeeId,
            status: 'ACTIVO',
          },
        });
      } else {
        loan = await this.loansRepository.findOne({
          where: { tenantId, employeeId: payload.employeeId, status: 'ACTIVO' },
          order: { id: 'ASC' },
        });
      }

      if (loan) {
        const paymentDate =
          payload.paymentDate ?? new Date().toISOString().slice(0, 10);

        const payment = this.loanPaymentsRepository.create({
          tenantId,
          loanId: loan.id,
          payrollId: savedPayroll.id,
          paymentDate,
          amount: payload.deductionLoan,
          source: 'NOMINA',
        });

        const savedPayment = await this.loanPaymentsRepository.save(payment);

        loan.paidAmount = Number(loan.paidAmount) + Number(savedPayment.amount);
        loan.balance = Math.max(
          0,
          Number(loan.principalAmount) - loan.paidAmount,
        );
        loan.status = loan.balance === 0 ? 'PAGADO' : 'ACTIVO';
        await this.loansRepository.save(loan);
      }
    }

    const payroll = await this.findPayrollOrFail(savedPayroll.id, tenantId, [
      'employee',
      'tenant',
    ]);

    const emailDispatch = await this.trySendPayrollEmail(payroll);

    return {
      ...this.serializePayroll(payroll),
      emailDispatch,
    };
  }

  async sendPayrollEmail(
    id: number,
    payload: SendPayrollEmailDto,
    tenantId: number,
  ) {
    const payroll = await this.findPayrollOrFail(id, tenantId, [
      'employee',
      'tenant',
    ]);

    const destination =
      payload.email?.trim() || payroll.employee?.email?.trim();
    if (!destination) {
      throw new BadRequestException('Debes indicar un correo destino');
    }

    const cc = payload.cc?.trim();
    const result = await this.dispatchPayrollEmail(payroll, destination, cc);

    return {
      success: result.sent,
      destination: result.destination,
    };
  }

  private isDuplicatePayrollPeriodError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = (
      error as QueryFailedError & {
        driverError?: { code?: string; errno?: number };
      }
    ).driverError;
    return driverError?.code === 'ER_DUP_ENTRY' || driverError?.errno === 1062;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundAmount(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private async findPayrollOrFail(
    id: number,
    tenantId: number,
    relations: string[] = [],
  ) {
    const payroll = await this.payrollRepository.findOne({
      where: { id, tenantId },
      relations,
    });
    if (!payroll) {
      throw new NotFoundException('Nómina no encontrada');
    }
    return payroll;
  }

  private serializePayroll(payroll: PayrollEntity) {
    const { employee, tenant, loanPayments, ...record } = payroll;
    void tenant;
    void loanPayments;

    return {
      ...record,
      employeeName: employee?.fullName ?? null,
      employeeEmail: employee?.email ?? null,
    };
  }

  private async trySendPayrollEmail(
    payroll: PayrollEntity,
  ): Promise<PayrollEmailDispatchResult> {
    const destination = payroll.employee?.email?.trim();
    if (!destination) {
      return {
        attempted: false,
        sent: false,
        destination: null,
      };
    }

    try {
      return await this.dispatchPayrollEmail(payroll, destination);
    } catch (error) {
      return {
        attempted: true,
        sent: false,
        destination,
        error: this.toErrorMessage(error),
      };
    }
  }

  private async dispatchPayrollEmail(
    payroll: PayrollEntity,
    destination: string,
    cc?: string,
  ): Promise<PayrollEmailDispatchResult> {
    const pdfBuffer = await buildPayrollPdfBuffer(payroll, payroll.tenant);
    const response = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': EMAIL_SERVICE_TOKEN,
      },
      body: JSON.stringify({
        destination: [destination],
        subject: this.buildPayrollEmailSubject(payroll),
        isHtml: true,
        body: this.buildPayrollEmailBody(payroll),
        ...(cc ? { cc } : {}),
        files: [
          {
            name: `${this.buildPayrollFileName(payroll)}.pdf`,
            size: String(pdfBuffer.length),
            content: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
          },
        ],
        nbTipo: EMAIL_SERVICE_NB_TIPO,
        nbEmpresa: EMAIL_SERVICE_NB_EMPRESA,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(
        body || `Error enviando correo de nómina (HTTP ${response.status})`,
      );
    }

    return {
      attempted: true,
      sent: true,
      destination,
    };
  }

  private buildPayrollEmailSubject(payroll: PayrollEntity): string {
    const employeeName = payroll.employee?.fullName ?? 'empleado';
    return `Nómina ${this.getPayrollPeriodLabel(payroll.year, payroll.month)} - ${employeeName}`;
  }

  private buildPayrollEmailBody(payroll: PayrollEntity): string {
    const employeeName = payroll.employee?.fullName ?? 'colaborador';
    const tenantName =
      payroll.tenant?.name ?? payroll.tenant?.legalName ?? 'la empresa';
    const period = this.getPayrollPeriodLabel(payroll.year, payroll.month);
    const paymentDate = payroll.paymentDate
      ? new Date(`${payroll.paymentDate}T12:00:00`).toLocaleDateString('es-CO')
      : 'pendiente';

    return [
      `<p>Hola ${employeeName},</p>`,
      `<p>Adjuntamos tu nómina correspondiente a <strong>${period}</strong>.</p>`,
      `<p>Empresa: <strong>${tenantName}</strong><br/>Fecha de pago: <strong>${paymentDate}</strong></p>`,
      '<p>Si ves alguna novedad, por favor responde este correo.</p>',
    ].join('');
  }

  private buildPayrollFileName(payroll: PayrollEntity): string {
    const employeeName = this.toSafeFilePart(
      payroll.employee?.fullName ?? `empleado-${payroll.employeeId}`,
    );
    return `nomina-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${employeeName}`;
  }

  private getPayrollPeriodLabel(year: number, month: number): string {
    return new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
  }

  private toSafeFilePart(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Error inesperado enviando correo';
  }

  private async loadPayrollConfig() {
    const mandatoryEarnings = await this.mandatoryEarningsRepository.find({
      where: [
        { code: 'SALARIO_MINIMO_MENSUAL', isActive: true },
        { code: 'AUXILIO_TRANSPORTE_MENSUAL', isActive: true },
      ],
    });
    const minimumWageParam = mandatoryEarnings.find(
      (e) => e.code === 'SALARIO_MINIMO_MENSUAL',
    );
    const transportAllowanceParam = mandatoryEarnings.find(
      (e) => e.code === 'AUXILIO_TRANSPORTE_MENSUAL',
    );
    if (!minimumWageParam || !transportAllowanceParam) {
      throw new BadRequestException(
        'No están parametrizados SALARIO_MINIMO_MENSUAL y AUXILIO_TRANSPORTE_MENSUAL',
      );
    }

    const minimumWageMonthly = Number(minimumWageParam.monthlyAmount);
    const transportAllowanceMonthly = Number(
      transportAllowanceParam.monthlyAmount,
    );
    const transportAllowanceDaily = this.roundAmount(
      transportAllowanceMonthly / 30,
      6,
    );

    return {
      minimumWageMonthly,
      transportAllowanceMonthly,
      transportAllowanceDaily,
      transportAllowanceSalaryLimit: minimumWageMonthly * 2,
    };
  }
}
