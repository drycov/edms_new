export type NomenclatureItem = {
  id: string;
  parent_id: string | null;
  code: string;
  title: string;
  description: string | null;
  retention_years: number | null;
  is_active: boolean;
  organization_id: string;
};

export type NomenclatureTreeNode = NomenclatureItem & {
  children: NomenclatureTreeNode[];
};