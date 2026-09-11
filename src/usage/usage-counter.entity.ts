import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type UsageKind =
  | 'analysis'
  | 'creative_intelligence'
  | 'rankings_view';

@Entity('usage_counters')
@Unique(['userId', 'kind', 'periodKey'])
export class UsageCounter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.usage, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar' })
  kind!: UsageKind;

  /** YYYY-MM or "lifetime" for one-shot quotas */
  @Column()
  periodKey!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
