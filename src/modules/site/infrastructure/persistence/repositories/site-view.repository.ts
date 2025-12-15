import { SiteView } from '../../../domain/entities/site-view.entity';

export interface ISiteViewRepository {
  create(view: Partial<SiteView>): Promise<SiteView>;
}

