import { lazy } from 'react';

const AdminPage = lazy(() =>
  import('./ui/AdminPage').then((m) => ({
    default: m.AdminPage,
  }))
);

export { AdminPage };