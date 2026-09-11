import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('product_snapshots')
@Index(['productId', 'weekKey'], { unique: true })
export class ProductSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, (product) => product.snapshots, {
    onDelete: 'CASCADE',
  })
  product!: Product;

  /** ISO week key: YYYY-Www */
  @Column()
  weekKey!: string;

  @Column({ type: 'int', nullable: true })
  rank!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  demand!: string | null;

  @Column({ type: 'varchar', default: 'estimated' })
  demandKind!: 'real' | 'estimated' | 'unavailable';

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedSales!: string | null;

  @Column({ type: 'varchar', default: 'estimated' })
  estimatedSalesKind!: 'real' | 'estimated' | 'unavailable';

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  gmv!: string | null;

  @Column({ type: 'varchar', default: 'unavailable' })
  gmvKind!: 'real' | 'estimated' | 'unavailable';

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  growthPct!: string | null;

  @Column({ type: 'jsonb', default: {} })
  signals!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
