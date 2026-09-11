import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity('watchlist_items')
@Unique(['userId', 'productId'])
export class WatchlistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.watchlist, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  product!: Product;

  @CreateDateColumn()
  createdAt!: Date;
}
