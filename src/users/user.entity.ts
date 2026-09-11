import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WatchlistItem } from '../watchlist/watchlist-item.entity';
import { UsageCounter } from '../usage/usage-counter.entity';

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, type: 'varchar' })
  passwordHash!: string | null;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'varchar' })
  googleId!: string | null;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true, type: 'varchar' })
  emailVerifyToken!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpires!: Date | null;

  @Column({ type: 'varchar', default: 'basic' })
  plan!: 'basic' | 'pro';

  @Column({ type: 'varchar', default: 'none' })
  subscriptionStatus!: SubscriptionStatus;

  @Column({ nullable: true, type: 'varchar' })
  stripeCustomerId!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  stripeSubscriptionId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ default: false })
  cancelAtPeriodEnd!: boolean;

  /**
   * Target Amazon marketplace for rankings/analysis (US, ES, DE, …).
   * Basic: one market. Pro: can switch freely; country boards unlocked separately.
   */
  @Column({ type: 'varchar', default: 'ES' })
  targetMarket!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  /** Eligible for waitlist Stripe coupon (set when registering via invite). */
  @Column({ default: false })
  waitlistDiscountEligible!: boolean;

  @Column({ type: 'uuid', nullable: true })
  waitlistEntryId!: string | null;

  @OneToMany(() => WatchlistItem, (item) => item.user)
  watchlist!: WatchlistItem[];

  @OneToMany(() => UsageCounter, (counter) => counter.user)
  usage!: UsageCounter[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
