import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Plus, FolderTree, ChevronRight, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/toaster';

type NomenclatureItem = {
  id: string;
  parent_id: string | null;
  code: string;
  title: string;
  description: string | null;
  retention_years: number | null;
  archive_after_years: number | null;
  destroy_after_years: number | null;
  is_active: boolean;
  created_at: string;
};

export function NomenclaturePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    code: '',
    title: '',
    description: '',
    retention_years: 5,
    parent_id: null as string | null,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['nomenclature'],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('nomenclature_items')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;
      return data as NomenclatureItem[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (payload: typeof newItem) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('nomenclature_items')
        .insert({
          code: payload.code,
          title: payload.title,
          description: payload.description,
          retention_years: payload.retention_years,
          parent_id: payload.parent_id,
          organization_id: profile.organization_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      setShowCreateDialog(false);
      setNewItem({ code: '', title: '', description: '', retention_years: 5, parent_id: null });
      toast.success(t('common.success'), t('common.create'));
    },
    onError: (error: any) => {
      toast.error(t('common.error'), error.message);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nomenclature_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success(t('common.success'), t('common.delete'));
    },
  });

  // Build tree structure
  const buildTree = (items: NomenclatureItem[], parentId: string | null = null): (NomenclatureItem & { children: NomenclatureItem[] })[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  const tree = items ? buildTree(items) : [];

  const toggleFolder = (id: string) => {
    if (expandedFolders.includes(id)) {
      setExpandedFolders(expandedFolders.filter((f) => f !== id));
    } else {
      setExpandedFolders([...expandedFolders, id]);
    }
  };

  const handleCreate = () => {
    if (!newItem.code || !newItem.title) {
      toast.error(t('common.error'), t('common.name') + ' is required');
      return;
    }
    createItem.mutate({ ...newItem, parent_id: selectedParent });
  };

  const NomenclatureTreeNode = ({ item, level = 0 }: { item: NomenclatureItem & { children: NomenclatureItem[] }; level?: number }) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedFolders.includes(item.id);

    return (
      <>
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleFolder(item.id)} className="p-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <FolderTree className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-900">{item.code}</span>
          <span className="text-sm text-gray-600 flex-1">{item.title}</span>
          {item.retention_years && (
            <Badge variant="secondary" className="text-xs">
              {item.retention_years} {t('nomenclature.retentionYears')}
            </Badge>
          )}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedParent(item.id);
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteItem.mutate(item.id)}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
        {isExpanded && item.children.map((child) => (
          <NomenclatureTreeNode key={child.id} item={child as any} level={level + 1} />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nomenclature.title')}</h1>
          <p className="text-gray-500 mt-1">{t('nomenclature.subtitle')}</p>
        </div>
        <Button onClick={() => {
          setSelectedParent(null);
          setShowCreateDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('nomenclature.addFolder')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FolderTree className="h-12 w-12 mb-4 text-gray-300" />
              <p className="font-medium">{t('templates.noTemplates')}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setSelectedParent(null);
                  setShowCreateDialog(true);
                }}
              >
                {t('nomenclature.addFolder')}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {tree.map((item) => (
                <NomenclatureTreeNode key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('nomenclature.addFolder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.code')} *
              </label>
              <Input
                value={newItem.code}
                onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                placeholder="01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.title_field')} *
              </label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder={t('nomenclature.title_field')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.description')}
              </label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder={t('common.description')}
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.retentionYears')}
              </label>
              <Input
                type="number"
                value={newItem.retention_years}
                onChange={(e) => setNewItem({ ...newItem, retention_years: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={createItem.isPending}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
