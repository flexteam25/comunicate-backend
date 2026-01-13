export class SiteReviewCommentImageResponseDto {
  id: string;
  imageUrl: string;
  order: number;
  createdAt: Date;
}

export class SiteReviewCommentResponseDto {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  userBadge?: {
    name: string;
    iconUrl: string;
    earnedAt?: Date;
    description?: string;
    obtain?: string;
  } | null;
  parentCommentId?: string;
  hasChild: boolean;
  images: SiteReviewCommentImageResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class SiteReviewImageResponseDto {
  id: string;
  imageUrl: string;
  order: number;
  createdAt: Date;
}

export class SiteReviewResponseDto {
  id: string;
  siteId: string;
  siteSlug?: string;
  siteName?: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  userBadge?: {
    name: string;
    iconUrl: string;
    earnedAt?: Date;
    description?: string;
    obtain?: string;
  } | null;
  rating: number;
  odds: number;
  limit: number;
  event: number;
  speed: number;
  content: string;
  images: SiteReviewImageResponseDto[];
  isPublished: boolean;
  reactions: {
    like: number;
    dislike: number;
  };
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
