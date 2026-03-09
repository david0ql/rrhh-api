import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  PayrollEntity,
} from '../../database/entities';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeesRepository: Repository<EmployeeEntity>,
    @InjectRepository(PayrollEntity)
    private readonly payrollRepository: Repository<PayrollEntity>,
    @InjectRepository(LoanEntity)
    private readonly loansRepository: Repository<LoanEntity>,
  ) {}

  async summary(tenantId: number) {
    const [employeesTotal, employeesActive, payrollCount, loansActiveCount] =
      await Promise.all([
        this.employeesRepository.count({ where: { tenantId } }),
        this.employeesRepository.count({ where: { tenantId, isActive: true } }),
        this.payrollRepository.count({ where: { tenantId } }),
        this.loansRepository.count({ where: { tenantId, status: 'ACTIVO' } }),
      ]);

    const loanBalanceResult = await this.loansRepository
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.balance), 0)', 'total')
      .where('l.status = :status', { status: 'ACTIVO' })
      .andWhere('l.tenant_id = :tenantId', { tenantId })
      .getRawOne<{ total: string }>();

    const [latestPayroll] = await this.payrollRepository.find({
      where: { tenantId },
      order: { year: 'DESC', month: 'DESC', id: 'DESC' },
      take: 1,
    });

    const latestPayrollTotals = latestPayroll
      ? await this.payrollRepository
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.totalEarnings), 0)', 'totalEarnings')
          .addSelect('COALESCE(SUM(p.totalDeductions), 0)', 'totalDeductions')
          .addSelect('COALESCE(SUM(p.netPay), 0)', 'netPay')
          .where(
            'p.year = :year AND p.month = :month AND p.tenant_id = :tenantId',
            {
              year: latestPayroll.year,
              month: latestPayroll.month,
              tenantId,
            },
          )
          .getRawOne<{
            totalEarnings: string;
            totalDeductions: string;
            netPay: string;
          }>()
      : { totalEarnings: '0', totalDeductions: '0', netPay: '0' };
    const safeTotals = latestPayrollTotals ?? {
      totalEarnings: '0',
      totalDeductions: '0',
      netPay: '0',
    };

    return {
      employees: {
        total: employeesTotal,
        active: employeesActive,
        inactive: employeesTotal - employeesActive,
      },
      payroll: {
        records: payrollCount,
        latestPeriod: latestPayroll
          ? { year: latestPayroll.year, month: latestPayroll.month }
          : null,
        latestTotals: {
          totalEarnings: Number(safeTotals.totalEarnings),
          totalDeductions: Number(safeTotals.totalDeductions),
          netPay: Number(safeTotals.netPay),
        },
      },
      loans: {
        activeCount: loansActiveCount,
        activeBalance: Number(loanBalanceResult?.total ?? 0),
      },
    };
  }
}
