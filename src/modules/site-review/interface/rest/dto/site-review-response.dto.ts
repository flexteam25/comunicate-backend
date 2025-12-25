export class SiteReviewCommentResponseDto {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  parentCommentId?: string;
  hasChild: boolean;
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
  siteName?: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
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
