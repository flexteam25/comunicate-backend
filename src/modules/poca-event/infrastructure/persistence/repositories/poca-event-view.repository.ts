import { PocaEventView } from '../../../domain/entities/poca-event-view.entity';

export interface IPocaEventViewRepository {
  create(view: Partial<PocaEventView>): Promise<PocaEventView | null>;
}
