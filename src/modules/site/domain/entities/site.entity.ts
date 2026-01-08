import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { SiteCategory } from './site-category.entity';
import { Tier } from '../../../tier/domain/entities/tier.entity';
import { SiteBadge } from './site-badge.entity';
import { SiteDomain } from './site-domain.entity';
import { ScamReport } from '../../../scam-report/domain/entities/scam-report.entity';

export enum SiteStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  MONITORED = 'monitored',
}

@Entity('sites')
export class Site extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({
    name: 'main_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  mainImageUrl?: string;

  @Column({
    name: 'site_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  siteImageUrl?: string;

  @Column({ name: 'tier_id', type: 'uuid', nullable: true })
  tierId?: string;

  @Column({
    name: 'permanent_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  permanentUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SiteStatus.UNVERIFIED,
  })
  status: SiteStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'review_count', type: 'integer', default: 0 })
  reviewCount: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @Column({
    name: 'first_charge',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'First charge percentage (%)',
  })
  firstCharge?: number;

  @Column({
    name: 'recharge',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Recharge percentage (%)',
  })
  recharge?: number;

  @Column({
    name: 'experience',
    type: 'integer',
    default: 0,
    comment: 'Experience points',
  })
  experience: number;

  @ManyToOne(() => SiteCategory, (category) => category.sites)
  @JoinColumn({ name: 'category_id' })
  category: SiteCategory;

  @ManyToOne(() => Tier, (tier) => tier.sites, { nullable: true })
  @JoinColumn({ name: 'tier_id' })
  tier: Tier;

  @OneToMany(() => SiteBadge, (siteBadge) => siteBadge.site)
  siteBadges: SiteBadge[];

  @OneToMany(() => SiteDomain, (siteDomain) => siteDomain.site)
  siteDomains: SiteDomain[];

  @OneToMany(() => ScamReport, (scamReport) => scamReport.site)
  scamReports: ScamReport[];

  @OneToMany('SiteManager', 'site')
  siteManagers: any[];

  // Computed property loaded by loadRelationCountAndMap
  issueCount?: number;
}
