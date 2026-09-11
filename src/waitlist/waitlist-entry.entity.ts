import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WaitlistEntryStatus =
  | 'waiting'
  | 'invited'
  | 'registered'
  | 'removed';

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column({ type: 'varchar', default: 'waiting' })
  status!: WaitlistEntryStatus;

  /** How many times this person let an invite expire (0–3). */
  @Column({ type: 'int', default: 0 })
  expireCount!: number;

  /** Cannot receive a new invite until this time. */
  @Column({ type: 'timestamptz', nullable: true })
  cooldownUntil!: Date | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  inviteToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteSentAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  inviteExpiresAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  registeredUserId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  source!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
