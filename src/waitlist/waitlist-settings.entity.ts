import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Singleton row id = 'default' */
@Entity('waitlist_settings')
export class WaitlistSettings {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  /** When false: public registration closed, only waitlist signup. */
  @Column({ default: true })
  registrationOpen!: boolean;

  /** Hours to create account after invite email. */
  @Column({ type: 'int', default: 48 })
  accessWindowHours!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
