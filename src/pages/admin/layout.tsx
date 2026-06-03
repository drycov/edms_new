import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  ADMIN_CARDS,
  type AdminCardConfig,
} from './constants';

export function AdminLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r p-4 flex flex-col gap-2">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Admin Panel
          </h2>
          <p className="text-xs text-gray-500">
            System management
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {/* Dashboard */}
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Dashboard
          </NavLink>

          {/* Dynamic links from config */}
          {ADMIN_CARDS.map((item: AdminCardConfig) => (
            <NavLink
              key={item.key}
              to={item.route}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm transition ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {t(item.title)}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}