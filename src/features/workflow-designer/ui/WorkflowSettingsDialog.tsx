import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { Button } from '@/shared/ui/button';

import type { WorkflowSettings } from '../model/types';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: WorkflowSettings;
  onSave: (data: WorkflowSettings) => void;
};

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: Props) {
  /**
   * локальный draft (изоляция от внешнего state)
   */
  const [draft, setDraft] = useState<WorkflowSettings>(initial);

  /**
   * синхронизация при открытии
   */
  useEffect(() => {
    if (open) {
      setDraft(initial);
    }
  }, [open, initial]);

  /**
   * нормализация перед сохранением
   */
  const normalize = (data: WorkflowSettings): WorkflowSettings => ({
    ...data,
    name: data.name.trim(),
    code: data.code.trim().toUpperCase().replace(/\s+/g, '_'),
    default_sla_hours: Number(data.default_sla_hours) || 72,
  });

  /**
   * validation (минимальный, без зависимости от схем)
   */
  const isValid = draft.name.trim().length > 0 && draft.code.trim().length > 0;

  const handleSave = () => {
    const normalized = normalize(draft);
    onSave(normalized);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Workflow settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">

          {/* NAME */}
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={draft.name}
              onChange={(e) =>
                setDraft((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Approval workflow"
            />
          </div>

          {/* CODE */}
          <div>
            <label className="text-sm font-medium">Code *</label>
            <Input
              value={draft.code}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="WF_APPROVAL"
            />
            <p className="text-xs text-gray-400 mt-1">
              Auto-normalized to UPPER_CASE
            </p>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              rows={3}
              placeholder="Describe workflow purpose"
            />
          </div>

          {/* TRIGGER TYPE */}
          <div>
            <label className="text-sm font-medium">Trigger type</label>
            <Select
              value={draft.trigger_type}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  trigger_type: e.target.value,
                }))
              }
            >
              <option value="manual">Manual</option>
              <option value="document_created">Document created</option>
              <option value="document_registered">Document registered</option>
              <option value="scheduled">Scheduled</option>
            </Select>
          </div>

          {/* SLA */}
          <div>
            <label className="text-sm font-medium">
              Default SLA (hours)
            </label>
            <Input
              type="number"
              value={draft.default_sla_hours}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  default_sla_hours: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!isValid}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}