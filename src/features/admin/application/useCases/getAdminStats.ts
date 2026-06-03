import { supabase } from '@/shared/api/supabase';
import { AdminRepository } from '../../infrastructure/admin.repository';
import type { AdminStats } from '../../domain/adminStats';

const repo = new AdminRepository();

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) throw new Error('Not authenticated');

  const orgId = await repo.getOrganizationId(user.id);

  const [stats, migrations] = await Promise.all([
    repo.getStats(orgId),
    repo.getMigrations(),
  ]);

  return {
    ...stats,
    migrations,
  };
}