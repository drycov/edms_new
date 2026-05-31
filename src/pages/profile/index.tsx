import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/api/supabase';
import { User, Mail, Phone, Building, Clock, Edit2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../shared/lib/utils';
import { useState } from 'react';
import { toast } from '../../shared/ui/toaster';

export function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    position: '',
    phone: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments(id, name),
          organization:organizations(id, name)
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      setForm({
        full_name: data?.full_name || '',
        position: data?.position || '',
        phone: data?.phone || '',
      });

      return {
        ...data,
        email: user.email,
        created_at: user.created_at,
      };
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(id, name, display_name)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (payload: typeof form) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: payload.full_name,
          position: payload.position,
          phone: payload.phone,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      toast.success(t('common.success'), t('common.save'));
    },
    onError: (error: any) => {
      toast.error(t('common.error'), error.message);
    },
  });

  const handleSave = () => {
    updateProfile.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-gray-500 mt-1">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile?.full_name || 'User'}
                </h2>
                <Badge variant="success">{profile?.is_active ? t('workflows.active') : 'Inactive'}</Badge>
              </div>
              <p className="text-gray-500">{profile?.email}</p>
              <p className="text-sm text-gray-400 mt-1">
                {profile?.position || t('common.none')} • {profile?.department?.name || t('common.none')}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={updateProfile.isPending}
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('profile.accountDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.name')}
                  </label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder={t('common.name')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.type')}
                  </label>
                  <Input
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder={t('common.type')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.email')}
                  </label>
                  <Input value={profile?.email || ''} disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('auth.password')}
                  </label>
                  <Input value={profile?.phone || ''} disabled placeholder="+1 234 567 8900" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{t('auth.email')}</p>
                    <p className="text-sm font-medium">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{t('auth.password')}</p>
                    <p className="text-sm font-medium">{profile?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.organization')}</p>
                    <p className="text-sm font-medium">{profile?.department?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">{t('profile.memberSince')}</p>
                    <p className="text-sm font-medium">{formatDate(profile?.created_at)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('profile.rolesPermissions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRoles?.map((ur: any) => (
                <div key={ur.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium text-gray-900">
                    {ur.role?.display_name || ur.role?.name}
                  </span>
                  <Badge variant="success">{t('workflows.active')}</Badge>
                </div>
              ))}
              {(!userRoles || userRoles.length === 0) && (
                <p className="text-sm text-gray-500">{t('common.none')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
