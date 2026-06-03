import { lazy } from 'react';

const NomenclaturePage = lazy(() =>
  import('./ui/NomenclaturePage').then((m) => ({
    default: m.NomenclaturePage,
  }))
);

export { NomenclaturePage };