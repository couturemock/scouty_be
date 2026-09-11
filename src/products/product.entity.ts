import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductSnapshot } from '../snapshots/product-snapshot.entity';

export type MetricKind = 'real' | 'estimated' | 'unavailable';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column()
  title!: string;

  @Column({ nullable: true, type: 'varchar' })
  imageUrl!: string | null;

  @Column()
  category!: string;

  @Column({ type: 'varchar', default: 'ES' })
  country!: string;

  @Column({ type: 'simple-array', default: '' })
  sources!: string[];

  @Column({ type: 'varchar', nullable: true })
  amazonAsin!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tiktokProductId!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  currentPrice!: string | null;

  @Column({ type: 'int', nullable: true })
  currentRank!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedSales!: string | null;

  @Column({ type: 'varchar', default: 'estimated' })
  estimatedSalesKind!: MetricKind;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  gmv!: string | null;

  @Column({ type: 'varchar', default: 'unavailable' })
  gmvKind!: MetricKind;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  growthPct!: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating!: string | null;

  @Column({ type: 'int', nullable: true })
  reviewCount!: number | null;

  @Column({ type: 'varchar', nullable: true })
  amazonUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: {} })
  meta!: Record<string, unknown>;

  /** Snapshot week this product belongs to (draft until admin publishes that week) */
  @Column({ type: 'varchar', nullable: true })
  catalogWeekKey!: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedMarginPct!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedProfit!: string | null;

  @OneToMany(() => ProductSnapshot, (snapshot) => snapshot.product)
  snapshots!: ProductSnapshot[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
