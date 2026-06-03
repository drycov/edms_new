import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Plus, Search } from 'lucide-react';

import { useNomenclature } from '../model/useNomenclature';
import { buildTree } from '../model/tree';
import type { NomenclatureForm } from '../model/schema';

import { NomenclatureTree } from './NomenclatureTree';
import { NomenclatureDialog } from './NomenclatureDialog';
import { DeleteDialog } from './DeleteDialog';

export function NomenclaturePage() {
  const { data = [], create, remove, move, isLoading } = useNomenclature();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [parent, setParent] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<NomenclatureForm>({
    code: '',
    title: '',
    description: '',
    retention_years: 5,
  });

  const tree = useMemo(() => buildTree(data), [data]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSubmit = () => {
    create.mutate({ ...form, parent_id: parent });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nomenclature</h1>
        </div>

        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {/* search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* tree */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10">Loading...</div>
          ) : (
            <NomenclatureTree
              tree={tree}
              expanded={expanded}
              onToggle={toggle}
              onAdd={(id) => {
                setParent(id);
                setOpen(true);
              }}
              onDelete={(id) => setDeleteId(id)}
              onDrop={(dragId, targetId) =>
                move.mutate({ id: dragId, parent_id: targetId })
              }
            />
          )}
        </CardContent>
      </Card>

      {/* dialog */}
      <NomenclatureDialog
        open={open}
        onOpenChange={setOpen}
        form={form}
        onChange={(k, v) =>
          setForm((p) => ({ ...p, [k]: v }))
        }
        onSubmit={handleSubmit}
      />

      {/* delete */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) remove.mutate(deleteId);
        }}
      />
    </div>
  );
}