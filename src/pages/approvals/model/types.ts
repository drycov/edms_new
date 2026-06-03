export type ApprovalTask = {
  id: string;
  status: string;
  due_date: string | null;
  created_at: string;
  workflow_run: {
    id: string;
    document: {
      id: string;
      title: string;
      registration_number: string | null;
    };
    workflow: {
      name: string;
    };
  };
};
