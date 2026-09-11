import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

export type AnalysisInputType = 'photo' | 'url' | 'text';

@Entity('analyses')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar' })
  inputType!: AnalysisInputType;

  @Column({ type: 'text', nullable: true })
  inputValue!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  productId!: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  product!: Product | null;

  @Column({ type: 'jsonb', default: {} })
  result!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
