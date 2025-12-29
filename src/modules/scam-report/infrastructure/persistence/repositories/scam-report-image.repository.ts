import { ScamReportImage } from '../../../domain/entities/scam-report-image.entity';

export interface IScamReportImageRepository {
  findByReportId(reportId: string): Promise<ScamReportImage[]>;
  create(image: Partial<ScamReportImage>): Promise<ScamReportImage>;
  createMany(images: Partial<ScamReportImage>[]): Promise<ScamReportImage[]>;
  delete(id: string): Promise<void>;
  deleteByReportId(reportId: string): Promise<void>;
  softDelete(ids: string[]): Promise<void>;
}
