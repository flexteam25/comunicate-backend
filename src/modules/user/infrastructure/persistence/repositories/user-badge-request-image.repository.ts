import { UserBadgeRequestImage } from '../../../domain/entities/user-badge-request-image.entity';

export interface IUserBadgeRequestImageRepository {
  create(image: Partial<UserBadgeRequestImage>): Promise<UserBadgeRequestImage>;
  createMany(images: Partial<UserBadgeRequestImage>[]): Promise<UserBadgeRequestImage[]>;
  findByRequestId(requestId: string): Promise<UserBadgeRequestImage[]>;
  deleteByRequestId(requestId: string): Promise<void>;
}
