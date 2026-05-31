import { Routes as RRDRoutes, Route } from 'react-router-dom';
import { Layout } from './layout';
import { DashboardPage } from '../pages/dashboard';
import { DocumentsPage } from '../pages/documents';
import { DocumentDetailsPage } from '../pages/documents/[id]';
import { CreateDocumentPage } from '../pages/documents/create';
import { WorkflowsPage } from '../pages/workflows';
import { WorkflowDesignerPage } from '../pages/workflows/designer';
import { TemplatesPage } from '../pages/templates';
import { NomenclaturePage } from '../pages/nomenclature';
import { ApprovalsPage } from '../pages/approvals';
import { TasksPage } from '../pages/tasks';
import { ArchivePage } from '../pages/archive';
import { SearchPage } from '../pages/search';
import { NotificationsPage } from '../pages/notifications';
import { AuditPage } from '../pages/audit';
import { AdminPage } from '../pages/admin';
import { ProfilePage } from '../pages/profile';
import { LoginPage } from '../pages/auth/login';

export function AppRoutes() {
  return (
    <RRDRoutes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/create" element={<CreateDocumentPage />} />
        <Route path="documents/:id" element={<DocumentDetailsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="workflows/designer" element={<WorkflowDesignerPage />} />
        <Route path="workflows/designer/:id" element={<WorkflowDesignerPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="nomenclature" element={<NomenclaturePage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </RRDRoutes>
  );
}
