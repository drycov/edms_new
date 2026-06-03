import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ADMIN_CARDS, SYSTEM_OVERVIEW_KEYS, type AdminCardConfig } from './constants';

type Stats = {
  usersCount: number;
  departmentsCount: number;
  rolesCount: number;
  documentsCount: number;
  workflowsCount: number;
  templatesCount: number;
};

type Migrations = {
  applied: number;
};

export function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const [
        { count: usersCount },
        { count: departmentsCount },
        { count: rolesCount },
        { count: documentsCount },
        { count: workflowsCount },
        { count: templatesCount },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id),

        supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id),

        supabase
          .from('roles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id),

        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id)
          .eq('is_deleted', false),

        supabase
          .from('workflows')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id),

        supabase
          .from('document_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id),
      ]);

      return {
        usersCount: usersCount || 0,
        departmentsCount: departmentsCount || 0,
        rolesCount: rolesCount || 0,
        documentsCount: documentsCount || 0,
        workflowsCount: workflowsCount || 0,
        templatesCount: templatesCount || 0,
      };
    },
  });

  const { data: migrations } = useQuery<Migrations>({
    queryKey: ['migrations'],
    queryFn: async () => {
      await supabase.from('audit_logs').select('created_at').limit(1);
      return { applied: 5 };
    },
  });

  const handleCardClick = (card: AdminCardConfig) => {
    if (card.route) {
      navigate(card.route);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('admin.subtitle')}
        </p>
      </div>

      {/* CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ADMIN_CARDS.map((card: AdminCardConfig) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.key}
              onClick={() => handleCardClick(card)}
              className="
                hover:border-blue-300
                hover:shadow-md
                cursor-pointer
                transition
                active:scale-[0.99]
              "
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {t(card.title)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t(card.description)}
                    </p>
                  </div>
                </div>

                <Badge variant={card.badgeColor || 'secondary'}>
                  {card.badgeValue?.(stats, t, migrations)}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SYSTEM OVERVIEW */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {SYSTEM_OVERVIEW_KEYS.map(
              (item: { key: keyof Stats; label: string }) => (
                <div
                  key={item.key}
                  className="p-4 rounded-lg bg-gray-50"
                >
                  <p className="text-sm text-gray-500">
                    {t(item.label)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.[item.key] ?? 0}
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}