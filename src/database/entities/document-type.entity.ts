import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'document_types' })
export class DocumentTypeEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: () => '1' })
  isActive!: boolean;
}
