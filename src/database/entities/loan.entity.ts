import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers/decimal.transformer';
import { EmployeeEntity } from './employee.entity';
import { LoanPaymentEntity } from './loan-payment.entity';
import { LoanStatusEntity } from './loan-status.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'loans' })
export class LoanEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({ name: 'employee_id', type: 'bigint', unsigned: true })
  employeeId!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  principalAmount!: number;

  @Column({
    name: 'suggested_installment_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  suggestedInstallmentAmount!: number | null;

  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: () => '0',
    transformer: decimalTransformer,
  })
  paidAmount!: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  balance!: number;

  @Column({ type: 'varchar', length: 20, default: () => "'ACTIVO'" })
  status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => LoanStatusEntity)
  @JoinColumn({ name: 'status', referencedColumnName: 'code' })
  statusRef!: LoanStatusEntity;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.loans)
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @OneToMany(() => LoanPaymentEntity, (payment) => payment.loan)
  payments!: LoanPaymentEntity[];
}
