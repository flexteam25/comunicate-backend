import { PostView } from '../../../domain/entities/post-view.entity';

export interface IPostViewRepository {
  create(view: Partial<PostView>): Promise<PostView>;
}
