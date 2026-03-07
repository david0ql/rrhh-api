import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity({ name: 'mandatory_earnings' })
export class MandatoryEarningEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    name: 'monthly_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  monthlyAmount!: number;

  @Column({ name: 'legal_reference', type: 'varchar', length: 255, nullable: true })
  legalReference!: string | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: () => '1' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
