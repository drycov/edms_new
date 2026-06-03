import {
  Settings,
  Users,
  Building,
  Shield,
  Database,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type AdminCardKey =
  | 'users'
  | 'organization'
  | 'security'
  | 'database'
  | 'integrations'
  | 'settings';

export interface AdminCardConfig {
  key: AdminCardKey;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;

  route: string; // 👈 добавили

  badgeColor?: 'secondary' | 'success';
  badgeValue?: (
    stats: any,
    t: (key: string) => string,
    migrations?: any
  ) => string;
}

export const ADMIN_CARDS: AdminCardConfig[] = [
  {
    key: 'users',
    title: 'admin.usersRoles',
    description: 'admin.usersRolesDesc',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    route: '/admin/users',
    badgeColor: 'secondary',
    badgeValue: (stats, t) =>
      `${stats?.usersCount || 0} ${t('admin.activeUsers')}`,
  },
  {
    key: 'organization',
    title: 'admin.organization',
    description: 'admin.organizationDesc',
    icon: Building,
    color: 'text-green-600',
    bg: 'bg-green-100',
    route: '/admin/organization',
    badgeColor: 'secondary',
    badgeValue: (stats, t) =>
      `${stats?.departmentsCount || 0} ${t('admin.departments')}`,
  },
  {
    key: 'security',
    title: 'admin.security',
    description: 'admin.securityDesc',
    icon: Shield,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    route: '/admin/security',
    badgeColor: 'success',
    badgeValue: (_, t) => t('admin.allSecure'),
  },
  {
    key: 'database',
    title: 'admin.database',
    description: 'admin.databaseDesc',
    icon: Database,
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    route: '/admin/database',
    badgeColor: 'secondary',
    badgeValue: (_, t, migrations) =>
      `v${migrations?.applied || 0} ${t('admin.applied')}`,
  },
  {
    key: 'integrations',
    title: 'admin.integrations',
    description: 'admin.integrationsDesc',
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    route: '/admin/integrations',
    badgeColor: 'secondary',
    badgeValue: () => `3 active`,
  },
  {
    key: 'settings',
    title: 'admin.systemSettings',
    description: 'admin.systemSettingsDesc',
    icon: Settings,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    route: '/admin/settings',
    badgeColor: 'secondary',
    badgeValue: (stats, t) => t('common.success'),
  },
];

export const SYSTEM_OVERVIEW_KEYS = [
  { key: 'documentsCount', label: 'documents.title' },
  { key: 'workflowsCount', label: 'workflows.title' },
  { key: 'templatesCount', label: 'templates.title' },
  { key: 'rolesCount', label: 'admin.rolesRoles' },
] as const;