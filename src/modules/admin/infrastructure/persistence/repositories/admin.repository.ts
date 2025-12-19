import { Admin } from '../../../domain/entities/admin.entity';

export interface IAdminRepository {
  findByEmail(email: string, relations?: string[]): Promise<Admin | null>;
  findById(id: string, relations?: string[]): Promise<Admin | null>;
  create(admin: Admin): Promise<Admin>;
  update(admin: Admin): Promise<Admin>;
  save(admin: Admin): Promise<Admin>;
}
