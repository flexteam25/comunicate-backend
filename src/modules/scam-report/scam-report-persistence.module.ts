import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScamReport } from './domain/entities/scam-report.entity';
import { ScamReportImage } from './domain/entities/scam-report-image.entity';
import { ScamReportComment } from './domain/entities/scam-report-comment.entity';
import { ScamReportCommentImage } from './domain/entities/scam-report-comment-image.entity';
import { ScamReportReaction } from './domain/entities/scam-report-reaction.entity';
import { ScamReportRepository } from './infrastructure/persistence/typeorm/scam-report.repository';
import { ScamReportImageRepository } from './infrastructure/persistence/typeorm/scam-report-image.repository';
import { ScamReportCommentRepository } from './infrastructure/persistence/typeorm/scam-report-comment.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScamReport,
      ScamReportImage,
      ScamReportComment,
      ScamReportCommentImage,
      ScamReportReaction,
    ]),
  ],
  providers: [
    {
      provide: 'IScamReportRepository',
      useClass: ScamReportRepository,
    },
    {
      provide: 'IScamReportImageRepository',
      useClass: ScamReportImageRepository,
    },
    {
      provide: 'IScamReportCommentRepository',
      useClass: ScamReportCommentRepository,
    },
  ],
  exports: [
    'IScamReportRepository',
    'IScamReportImageRepository',
    'IScamReportCommentRepository',
  ],
})
export class ScamReportPersistenceModule {}
