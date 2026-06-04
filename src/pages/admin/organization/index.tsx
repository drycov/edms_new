import { useState, useEffect } from 'react';
import { Save, Upload, Trash2, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/ui/toaster';
import { supabase } from '@/shared/api/supabase';
import { getCurrentUserOrganization } from '@/shared/lib/query-utils';

interface Organization {
  id: string;
  name: string;
  legal_name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  logo_url: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  head_id: string | null;
  organization_id: string;
}

export function OrganizationPage() {
  const { t } = useTranslation();
  const [org, setOrg] = useState<Organization | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openDept, setOpenDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { profile } = await getCurrentUserOrganization();

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) throw orgError;
      setOrg(orgData as Organization);

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (deptError) throw deptError;
      setDepartments(deptData as Department[]);
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!org) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: org.name,
          legal_name: org.legal_name,
          description: org.description,
          website: org.website,
          industry: org.industry,
          size: org.size,
        })
        .eq('id', org.id);

      if (error) throw error;
      toast.success('Success', 'Organization updated');
    } catch (error: any) {
      toast.error('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDept = async () => {
    if (!org || !deptForm.name.trim()) {
      toast.error('Error', 'Department name is required');
      return;
    }

    try {
      const { error } = await supabase.from('departments').insert({
        name: deptForm.name,
        code: deptForm.code.toUpperCase(),
        description: deptForm.description,
        organization_id: org.id,
      });

      if (error) throw error;
      toast.success('Success', 'Department created');
      setOpenDept(false);
      setDeptForm({ name: '', code: '', description: '' });
      loadData();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department?')) return;

    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Success', 'Department deleted');
      loadData();
    } catch (error: any) {
      toast.error('Error', error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-500 mt-1">Manage organization information and structure</p>
      </div>

      {/* Organization Info */}
      {org && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <Input
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                <Input
                  value={org.legal_name}
                  onChange={(e) => setOrg({ ...org, legal_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={org.description}
                onChange={(e) => setOrg({ ...org, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <Input
                  type="url"
                  value={org.website}
                  onChange={(e) => setOrg({ ...org, website: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <Input
                  value={org.industry}
                  onChange={(e) => setOrg({ ...org, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Size</label>
                <select
                  value={org.size}
                  onChange={(e) => setOrg({ ...org, size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                  <option>201-500</option>
                  <option>501-1000</option>
                  <option>1000+</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveOrg} loading={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Departments ({departments.length})</CardTitle>
          <Button size="sm" onClick={() => setOpenDept(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No departments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <div key={dept.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{dept.name}</p>
                      <p className="text-sm text-gray-600">{dept.code}</p>
                      {dept.description && (
                        <p className="text-xs text-gray-500 mt-1">{dept.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDept(dept.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={openDept} onOpenChange={setOpenDept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="e.g., Human Resources"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <Input
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g., HR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder="Department description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDept(false)}>Cancel</Button>
            <Button onClick={handleAddDept}>Create Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
