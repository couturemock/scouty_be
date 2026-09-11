import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

export type RankingScope =
  | 'general'
  | 'category'
  | 'country'
  | 'rising'
  | 'margin'
  | 'profit';

@Entity('ranking_entries')
@Index(['weekKey', 'scope', 'scopeKey', 'position'], { unique: true })
export class RankingEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  weekKey!: string;

  @Column({ type: 'varchar' })
  scope!: RankingScope;

  /** '*' for general, category name, or country code */
  @Column()
  scopeKey!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  product!: Product;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  score!: string | null;

  @Column({ type: 'jsonb', default: [] })
  signalSources!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}
