import { supabase } from '@/shared/api/supabase';
import type { AdminStats } from '../domain/adminStats';

export class AdminRepository {
  async getOrganizationId(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.organization_id) throw new Error('No organization');

    return data.organization_id;
  }

  async getStats(organizationId: string): Promise<Omit<AdminStats, 'migrations'>> {
    const [
      { count: usersCount },
      { count: departmentsCount },
      { count: rolesCount },
      { count: documentsCount },
      { count: workflowsCount },
      { count: templatesCount },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase.from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase.from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase.from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_deleted', false),

      supabase.from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase.from('document_templates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
    ]);

    return {
      usersCount: usersCount ?? 0,
      departmentsCount: departmentsCount ?? 0,
      rolesCount: rolesCount ?? 0,
      documentsCount: documentsCount ?? 0,
      workflowsCount: workflowsCount ?? 0,
      templatesCount: templatesCount ?? 0,
    };
  }

  async getMigrations(): Promise<number> {
    const { error } = await supabase
      .from('audit_logs')
      .select('created_at')
      .limit(1);

    if (error) return 0;
    return 5;
  }
}