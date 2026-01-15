export class SiteReviewStatisticsResponseDto {
  siteId: string;
  averageRating: number;
  averageOdds: number;
  averageLimit: number;
  averageEvent: number;
  averageSpeed: number;
  reviewCount: number;
  topReviews: string[];
  highlights: string[];
  enHighlights: string[];
}
