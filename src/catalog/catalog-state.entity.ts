import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Singleton-style catalog control. Only one row should exist (id fixed on bootstrap).
 * Admin ingests → draftWeekKey. Admin publishes → publishedWeekKey = draft.
 * Users always read publishedWeekKey only.
 */
@Entity('catalog_state')
export class CatalogState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Week visible to paying users on the web */
  @Column({ type: 'varchar', nullable: true })
  publishedWeekKey!: string | null;

  /** Latest ingested week (may differ until admin publishes) */
  @Column({ type: 'varchar', nullable: true })
  draftWeekKey!: string | null;

  @Column({ type: 'simple-array', default: '' })
  draftMarkets!: string[];

  @Column({ type: 'int', default: 0 })
  draftProductCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastIngestAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastPublishedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastPublishedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  lastIngestNote!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
