import { Routes as RRDRoutes, Route } from 'react-router-dom';

import { Layout } from './layout';

import { DashboardPage } from '@/pages/dashboard';

import { DocumentsPage } from '@/pages/documents';
import { DocumentDetailsPage } from '@/pages/documents/[id]';
import { CreateDocumentPage } from '@/pages/documents/create';

import { WorkflowsPage } from '@/pages/workflows';
import { WorkflowDesignerPage } from '@/pages/workflows';

import { TemplatesPage } from '@/pages/templates';
import { NomenclaturePage } from '@/pages/nomenclature';
import { ApprovalsPage } from '@/pages/approvals';
import { TasksPage } from '@/pages/tasks';
import { ArchivePage } from '@/pages/archive';
import { SearchPage } from '@/pages/search';
import { NotificationsPage } from '@/pages/notifications';
import { AuditPage } from '@/pages/audit';

import { AdminLayout } from '@/pages/admin/layout';
import { AdminPage } from '@/pages/admin';

import { UsersPage } from '@/pages/admin/users';
import { OrganizationPage } from '@/pages/admin/organization';
import { SecurityPage } from '@/pages/admin/security';
import { DatabasePage } from '@/pages/admin/database';
import { IntegrationsPage } from '@/pages/admin/integrations';
import { SettingsPage } from '@/pages/admin/settings';

import { ProfilePage } from '@/pages/profile';
import { LoginPage } from '@/pages/auth/login';

export function AppRoutes() {
  return (
    <RRDRoutes>
      {/* AUTH */}
      <Route path="/login" element={<LoginPage />} />

      {/* MAIN LAYOUT */}
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />

        {/* DOCUMENTS */}
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/create" element={<CreateDocumentPage />} />
        <Route path="documents/:id" element={<DocumentDetailsPage />} />

        {/* WORKFLOWS */}
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="workflows/new" element={<WorkflowDesignerPage />} />
        <Route path="workflows/:id/design" element={<WorkflowDesignerPage />} />

        {/* OTHER MODULES */}
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="nomenclature" element={<NomenclaturePage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />

        {/* ADMIN - NESTED ROUTES (KEY FIX) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminPage />} />

          <Route path="users" element={<UsersPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="database" element={<DatabasePage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* PROFILE */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </RRDRoutes>
  );
}