import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { getAdminStats } from '../application/useCases/getAdminStats';
import { AdminCard } from './components/AdminCard';

import {
  Users,
  Building,
  Shield,
  Database,
  Zap,
  Settings,
} from 'lucide-react';

import { Badge } from '@/shared/ui/badge';

export function AdminPage() {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <p className="text-gray-500">{t('admin.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Users />
            <div>
              <h3>{t('admin.usersRoles')}</h3>
            </div>
          </div>
          <Badge>{data?.usersCount ?? 0}</Badge>
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Building />
            <div>
              <h3>{t('admin.organization')}</h3>
            </div>
          </div>
          <Badge>{data?.departmentsCount ?? 0}</Badge>
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Shield />
            <div>
              <h3>{t('admin.security')}</h3>
            </div>
          </div>
          <Badge>{t('admin.allSecure')}</Badge>
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Database />
            <div>
              <h3>{t('admin.database')}</h3>
            </div>
          </div>
          <Badge>v{data?.migrations ?? 0}</Badge>
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Zap />
            <div>
              <h3>{t('admin.integrations')}</h3>
            </div>
          </div>
          <Badge>3</Badge>
        </AdminCard>

        <AdminCard>
          <div className="flex gap-3 mb-4">
            <Settings />
            <div>
              <h3>{t('admin.systemSettings')}</h3>
            </div>
          </div>
          <Badge>{t('common.success')}</Badge>
        </AdminCard>

      </div>
    </div>
  );
}