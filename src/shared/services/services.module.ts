import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { TransactionService } from './transaction.service';
import { CommentHasChildService } from './comment-has-child.service';
import { PostComment } from '../../modules/post/domain/entities/post-comment.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { ScamReportComment } from '../../modules/scam-report/domain/entities/scam-report-comment.entity';
import { PointPersistenceModule } from '../../modules/point/point-persistence.module';
import { PointRewardService } from '../../modules/point/application/services/point-reward.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PostComment, SiteReviewComment, ScamReportComment]),
    PointPersistenceModule,
  ],
  providers: [
    PasswordService,
    JwtService,
    TransactionService,
    CommentHasChildService,
    PointRewardService,
  ],
  exports: [
    PasswordService,
    JwtService,
    TransactionService,
    CommentHasChildService,
    PointRewardService,
  ],
})
export class ServicesModule {}
