import { SiteBadgeRequestImage } from '../../../domain/entities/site-badge-request-image.entity';

export interface ISiteBadgeRequestImageRepository {
  create(image: Partial<SiteBadgeRequestImage>): Promise<SiteBadgeRequestImage>;
  createMany(images: Partial<SiteBadgeRequestImage>[]): Promise<SiteBadgeRequestImage[]>;
  findByRequestId(requestId: string): Promise<SiteBadgeRequestImage[]>;
  deleteByRequestId(requestId: string): Promise<void>;
}
