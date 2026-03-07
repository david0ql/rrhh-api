import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity({ name: 'mandatory_deductions' })
export class MandatoryDeductionEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'employee_rate', type: 'decimal', precision: 5, scale: 2, transformer: decimalTransformer })
  employeeRate!: number;

  @Column({ name: 'employer_rate', type: 'decimal', precision: 5, scale: 2, transformer: decimalTransformer })
  employerRate!: number;

  @Column({ name: 'legal_reference', type: 'varchar', length: 255, nullable: true })
  legalReference!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: () => '1' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
