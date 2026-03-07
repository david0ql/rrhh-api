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
import { DocumentTypeEntity } from './document-type.entity';
import { LoanEntity } from './loan.entity';
import { PayrollEntity } from './payroll.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity({ name: 'employees' })
export class EmployeeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 10, default: () => "'CC'" })
  documentType!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 30, unique: true })
  documentNumber!: string;

  @Column({ name: 'job_title', type: 'varchar', length: 100 })
  jobTitle!: string;

  @Column({ name: 'base_salary', type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  baseSalary!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: () => '1' })
  isActive!: boolean;

  @Column({ name: 'hired_at', type: 'date' })
  hiredAt!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => DocumentTypeEntity)
  @JoinColumn({ name: 'document_type', referencedColumnName: 'code' })
  documentTypeRef!: DocumentTypeEntity;

  @OneToMany(() => PayrollEntity, (payroll) => payroll.employee)
  payrollRecords!: PayrollEntity[];

  @OneToMany(() => LoanEntity, (loan) => loan.employee)
  loans!: LoanEntity[];
}
