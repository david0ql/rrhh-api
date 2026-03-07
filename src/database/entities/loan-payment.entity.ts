import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers/decimal.transformer';
import { LoanEntity } from './loan.entity';
import { PayrollEntity } from './payroll.entity';

@Entity({ name: 'loan_payments' })
export class LoanPaymentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'loan_id', type: 'bigint', unsigned: true })
  loanId!: number;

  @Column({ name: 'payroll_id', type: 'bigint', unsigned: true, nullable: true })
  payrollId!: number | null;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: () => "'NOMINA'" })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => LoanEntity, (loan) => loan.payments)
  @JoinColumn({ name: 'loan_id' })
  loan!: LoanEntity;

  @ManyToOne(() => PayrollEntity, (payroll) => payroll.loanPayments)
  @JoinColumn({ name: 'payroll_id' })
  payroll!: PayrollEntity | null;
}
