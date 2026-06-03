import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import type { NomenclatureForm } from '../model/schema';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: NomenclatureForm;
  onChange: (key: keyof NomenclatureForm, value: any) => void;
  onSubmit: () => void;
};

export function NomenclatureDialog({
  open,
  onOpenChange,
  form,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create nomenclature item</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Input
            placeholder="Code"
            value={form.code}
            onChange={(e) => onChange('code', e.target.value)}
          />

          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
          />

          <Textarea
            placeholder="Description"
            value={form.description ?? ''}
            onChange={(e) => onChange('description', e.target.value)}
          />

          <Input
            type="number"
            value={form.retention_years}
            onChange={(e) =>
              onChange('retention_years', Number(e.target.value))
            }
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button onClick={onSubmit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}