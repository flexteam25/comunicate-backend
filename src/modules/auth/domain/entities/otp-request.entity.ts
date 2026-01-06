import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('otp_requests')
@Index('IDX_otp_requests_phone', ['phone'])
@Index('IDX_otp_requests_expires_at', ['expiresAt'])
export class OtpRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 10 })
  otp: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'request_count', type: 'integer', default: 1 })
  requestCount: number;

  @Column({ name: 'last_request_at', type: 'timestamptz' })
  lastRequestAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isVerified(): boolean {
    return !!this.verifiedAt;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isVerified();
  }
}
