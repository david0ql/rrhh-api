import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers/decimal.transformer';
import { EmployeeEntity } from './employee.entity';
import { LoanPaymentEntity } from './loan-payment.entity';

@Entity({ name: 'payroll' })
@Unique('uk_payroll_employee_period', ['employeeId', 'year', 'month'])
export class PayrollEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'employee_id', type: 'bigint', unsigned: true })
  employeeId!: number;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'tinyint', unsigned: true })
  month!: number;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate!: string | null;

  @Column({ name: 'days_worked', type: 'decimal', precision: 5, scale: 2, default: () => '30.00', transformer: decimalTransformer })
  daysWorked!: number;

  @Column({ name: 'earned_salary', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  earnedSalary!: number;

  @Column({ name: 'earned_extras', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  earnedExtras!: number;

  @Column({ name: 'earned_transport_allowance', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  earnedTransportAllowance!: number;

  @Column({ name: 'deduction_health', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  deductionHealth!: number;

  @Column({ name: 'deduction_pension', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  deductionPension!: number;

  @Column({ name: 'deduction_loan', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  deductionLoan!: number;

  @Column({ name: 'deduction_other', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  deductionOther!: number;

  @Column({ name: 'health_employee_rate', type: 'decimal', precision: 5, scale: 2, default: () => '4.00', transformer: decimalTransformer })
  healthEmployeeRate!: number;

  @Column({ name: 'health_employer_rate', type: 'decimal', precision: 5, scale: 2, default: () => '8.50', transformer: decimalTransformer })
  healthEmployerRate!: number;

  @Column({ name: 'pension_employee_rate', type: 'decimal', precision: 5, scale: 2, default: () => '4.00', transformer: decimalTransformer })
  pensionEmployeeRate!: number;

  @Column({ name: 'pension_employer_rate', type: 'decimal', precision: 5, scale: 2, default: () => '12.00', transformer: decimalTransformer })
  pensionEmployerRate!: number;

  @Column({ name: 'transport_allowance_monthly', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  transportAllowanceMonthly!: number;

  @Column({ name: 'transport_allowance_daily', type: 'decimal', precision: 14, scale: 4, default: () => '0', transformer: decimalTransformer })
  transportAllowanceDaily!: number;

  @Column({ name: 'minimum_wage_monthly', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  minimumWageMonthly!: number;

  @Column({ name: 'total_earnings', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  totalEarnings!: number;

  @Column({ name: 'total_deductions', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  totalDeductions!: number;

  @Column({ name: 'net_pay', type: 'decimal', precision: 14, scale: 2, default: () => '0', transformer: decimalTransformer })
  netPay!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.payrollRecords)
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @OneToMany(() => LoanPaymentEntity, (payment) => payment.payroll)
  loanPayments!: LoanPaymentEntity[];
}
