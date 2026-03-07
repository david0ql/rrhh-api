import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'loan_statuses' })
export class LoanStatusEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;
}
