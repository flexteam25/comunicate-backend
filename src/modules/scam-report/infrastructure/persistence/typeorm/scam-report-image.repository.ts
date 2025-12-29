import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScamReportImage } from '../../../domain/entities/scam-report-image.entity';
import { IScamReportImageRepository } from '../repositories/scam-report-image.repository';

@Injectable()
export class ScamReportImageRepository implements IScamReportImageRepository {
  constructor(
    @InjectRepository(ScamReportImage)
    private readonly repository: Repository<ScamReportImage>,
  ) {}

  async findByReportId(reportId: string): Promise<ScamReportImage[]> {
    return this.repository.find({
      where: { scamReportId: reportId, deletedAt: null },
      order: { order: 'ASC' },
    });
  }

  async create(image: Partial<ScamReportImage>): Promise<ScamReportImage> {
    const entity = this.repository.create(image);
    return this.repository.save(entity);
  }

  async createMany(images: Partial<ScamReportImage>[]): Promise<ScamReportImage[]> {
    const entities = this.repository.create(images);
    return this.repository.save(entities);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByReportId(reportId: string): Promise<void> {
    await this.repository.delete({ scamReportId: reportId });
  }

  async softDelete(ids: string[]): Promise<void> {
    if (ids.length > 0) {
      await this.repository.softDelete(ids);
    }
  }
}
