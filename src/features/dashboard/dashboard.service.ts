import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity, LoanEntity, PayrollEntity } from '../../database/entities';

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

  async summary() {
    const [employeesTotal, employeesActive, payrollCount, loansActiveCount] = await Promise.all([
      this.employeesRepository.count(),
      this.employeesRepository.count({ where: { isActive: true } }),
      this.payrollRepository.count(),
      this.loansRepository.count({ where: { status: 'ACTIVO' } }),
    ]);

    const loanBalanceResult = await this.loansRepository
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.balance), 0)', 'total')
      .where('l.status = :status', { status: 'ACTIVO' })
      .getRawOne<{ total: string }>();

    const [latestPayroll] = await this.payrollRepository.find({
      order: { year: 'DESC', month: 'DESC', id: 'DESC' },
      take: 1,
    });

    const latestPayrollTotals = latestPayroll
      ? await this.payrollRepository
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.totalEarnings), 0)', 'totalEarnings')
          .addSelect('COALESCE(SUM(p.totalDeductions), 0)', 'totalDeductions')
          .addSelect('COALESCE(SUM(p.netPay), 0)', 'netPay')
          .where('p.year = :year AND p.month = :month', {
            year: latestPayroll.year,
            month: latestPayroll.month,
          })
          .getRawOne<{ totalEarnings: string; totalDeductions: string; netPay: string }>()
      : { totalEarnings: '0', totalDeductions: '0', netPay: '0' };
    const safeTotals = latestPayrollTotals ?? { totalEarnings: '0', totalDeductions: '0', netPay: '0' };

    return {
      employees: {
        total: employeesTotal,
        active: employeesActive,
        inactive: employeesTotal - employeesActive,
      },
      payroll: {
        records: payrollCount,
        latestPeriod: latestPayroll ? { year: latestPayroll.year, month: latestPayroll.month } : null,
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
