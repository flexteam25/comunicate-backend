import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { TransactionService } from './transaction.service';
import { CommentHasChildService } from './comment-has-child.service';
import { PostComment } from '../../modules/post/domain/entities/post-comment.entity';
import { SiteReviewComment } from '../../modules/site-review/domain/entities/site-review-comment.entity';
import { ScamReportComment } from '../../modules/scam-report/domain/entities/scam-report-comment.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PostComment, SiteReviewComment, ScamReportComment]),
  ],
  providers: [PasswordService, JwtService, TransactionService, CommentHasChildService],
  exports: [PasswordService, JwtService, TransactionService, CommentHasChildService],
})
export class ServicesModule {}
