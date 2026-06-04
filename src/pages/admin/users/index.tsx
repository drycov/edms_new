import { useState, useEffect } from 'react';
import { Plus, Shield, Trash2, Mail, Check, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { formatDate } from '@/shared/lib/utils';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

type UserRole = 'admin' | 'manager' | 'approver' | 'contributor' | 'viewer';

interface OrgUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  last_activity: string | null;
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  approver: 'bg-amber-100 text-amber-800',
  contributor: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const roleDescriptions: Record<UserRole, string> = {
  admin: 'Full system access, user management, settings',
  manager: 'Documents, workflows, user management',
  approver: 'Approve documents, assign tasks',
  contributor: 'Create and edit documents',
  viewer: 'Read-only access',
};

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openInvite, setOpenInvite] = useState(false);
  const [openRole, setOpenRole] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'contributor' as UserRole });
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { profile } = await getCurrentUserOrganization();
      setOrganizationId(profile.organization_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, created_at, last_activity')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as OrgUser[]);
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      toast.error('Error', 'Email is required');
      return;
    }

    try {
      // In a real app, this would call an edge function to send invitation
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteForm.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) throw error;

      // Create profile for invited user
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: inviteForm.email,
          organization_id: organizationId,
          role: inviteForm.role,
          name: inviteForm.email.split('@')[0],
        });

        if (profileError) throw profileError;
      }

      toast.success('Success', `Invitation sent to ${inviteForm.email}`);
      setOpenInvite(false);
      setInviteForm({ email: '', role: 'contributor' });
      loadUsers();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleChangeRole = async (user: OrgUser, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Success', `${user.email} role updated to ${newRole}`);
      setOpenRole(false);
      loadUsers();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleDelete = async (user: OrgUser) => {
    if (!confirm(`Remove ${user.email}?`)) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // TODO: Delete auth user via edge function
      toast.success('Success', 'User removed');
      loadUsers();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage team members and their roles</p>
        </div>
        <Button onClick={() => setOpenInvite(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No team members yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Joined</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Last Activity</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.name || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={roleColors[user.role]}>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.last_activity ? formatDate(user.last_activity) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenRole(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
              >
                <option value="viewer">Viewer</option>
                <option value="contributor">Contributor</option>
                <option value="approver">Approver</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
              <p className="text-xs text-gray-500 mt-2">{roleDescriptions[inviteForm.role as UserRole]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      {selectedUser && (
        <Dialog open={openRole} onOpenChange={setOpenRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role: {selectedUser.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {(Object.keys(roleColors) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(selectedUser, role)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedUser.role === role
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{role}</p>
                      <p className="text-xs text-gray-600">{roleDescriptions[role]}</p>
                    </div>
                    {selectedUser.role === role && <Check className="h-5 w-5 text-blue-600" />}
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
