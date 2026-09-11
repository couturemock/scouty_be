import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CatalogSnapshotStatus = 'draft' | 'published' | 'superseded';

/**
 * One row per ingest run / weekKey. Users only see the snapshot marked active
 * via CatalogState.publishedWeekKey (status === 'published').
 */
@Entity('catalog_snapshots')
export class CatalogSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  weekKey!: string;

  @Column({ type: 'simple-array', default: '' })
  markets!: string[];

  @Column({ type: 'int', default: 0 })
  productCount!: number;

  @Column({ type: 'varchar', default: 'draft' })
  status!: CatalogSnapshotStatus;

  @Column({ type: 'timestamptz' })
  ingestedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  publishedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
