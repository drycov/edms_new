import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  FolderTree,
  Files,
  Archive,
  Search,
  Bell,
  Settings,
  CheckSquare,
  FileCheck,
  ShieldCheck,
  User,
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../../shared/lib/i18n';

const navigationKey = [
  { nameKey: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { nameKey: 'nav.documents', href: '/documents', icon: FileText },
  { nameKey: 'nav.approvals', href: '/approvals', icon: CheckSquare },
  { nameKey: 'nav.myTasks', href: '/tasks', icon: FileCheck },
  { nameKey: 'nav.workflows', href: '/workflows', icon: GitBranch },
  { nameKey: 'nav.templates', href: '/templates', icon: Files },
  { nameKey: 'nav.nomenclature', href: '/nomenclature', icon: FolderTree },
  { nameKey: 'nav.archive', href: '/archive', icon: Archive },
  { nameKey: 'nav.search', href: '/search', icon: Search },
  { nameKey: 'nav.notifications', href: '/notifications', icon: Bell },
  { nameKey: 'nav.auditLog', href: '/audit', icon: ShieldCheck },
  { nameKey: 'nav.administration', href: '/admin', icon: Settings },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = i18n.language || 'en';

  return (
    <div
      className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg">EDMS</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-700 transition-colors"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigationKey.map((item) => (
            <li key={item.nameKey}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{t(item.nameKey)}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Language Switcher */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-slate-700">
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  currentLang === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 p-4">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )
          }
        >
          <User className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>{t('nav.profile')}</span>}
        </NavLink>
      </div>
    </div>
  );
}
