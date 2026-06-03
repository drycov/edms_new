export type Notification = {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  created_at: string;
};
