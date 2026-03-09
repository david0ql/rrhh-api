import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants' })
export class TenantEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 180 })
  legalName!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 40 })
  taxId!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug!: string;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: () => '1' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
