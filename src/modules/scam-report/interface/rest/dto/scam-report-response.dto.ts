import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';

export class ScamReportImageResponseDto {
  id: string;
  imageUrl: string;
  order: number;
  createdAt: Date;
}

export class ScamReportCommentImageResponseDto {
  id: string;
  imageUrl: string;
  order: number;
}

export class ScamReportCommentResponseDto {
  id: string;
  content: string;
  images: ScamReportCommentImageResponseDto[];
  userId: string;
  userName?: string;
  userEmail?: string;
  parentCommentId?: string;
  hasChild: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ScamReportResponseDto {
  id: string;
  siteId?: string;
  siteUrl: string;
  siteName: string;
  siteAccountInfo: string;
  registrationUrl: string;
  contact: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  userBadges?: {
    name: string;
    iconUrl: string;
  }[];
  userEmail?: string;
  title: string;
  description: string;
  amount?: number;
  status: ScamReportStatus;
  images: ScamReportImageResponseDto[];
  reactions?: {
    like: number;
    dislike: number;
  };
  adminId?: string;
  adminName?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
