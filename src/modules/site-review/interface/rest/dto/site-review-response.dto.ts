export class SiteReviewCommentResponseDto {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  parentCommentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SiteReviewResponseDto {
  id: string;
  siteId: string;
  siteName?: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  title: string;
  content: string;
  isPublished: boolean;
  reactions: {
    like: number;
    dislike: number;
  };
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
