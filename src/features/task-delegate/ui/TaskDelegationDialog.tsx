/**
 * Task Delegate Feature - UI Component
 *
 * Reusable delegation dialog component
 */

import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useTranslation } from 'react-i18next';
import { TaskDelegationForm } from '../model/types';

interface TaskDelegationDialogProps {
  isOpen: boolean;
  taskId: string;
  taskTitle?: string;
  isLoading?: boolean;
  assignees?: Array<{ id: string; name: string }>;
  onDelegate: (form: TaskDelegationForm) => Promise<void>;
  onClose: () => void;
}

export function TaskDelegationDialog({
  isOpen,
  taskId,
  taskTitle = '',
  isLoading = false,
  assignees = [],
  onDelegate,
  onClose,
}: TaskDelegationDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TaskDelegationForm>({
    taskId,
    newAssigneeId: '',
    reason: '',
  });

  const handleDelegate = async () => {
    if (!form.newAssigneeId) {
      return;
    }
    await onDelegate(form);
    setForm({ taskId, newAssigneeId: '', reason: '' });
    onClose();
  };

  const handleClose = () => {
    setForm({ taskId, newAssigneeId: '', reason: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tasks.delegateTask')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
            <strong>{taskTitle}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.delegateTo')} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.newAssigneeId}
              onChange={(e) => setForm({ ...form, newAssigneeId: e.target.value })}
              disabled={isLoading}
            >
              <option value="">-- {t('common.select')} --</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.delegationReason')}
            </label>
            <Textarea
              value={form.reason || ''}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder={t('tasks.delegationReason')}
              rows={4}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleDelegate}
            disabled={isLoading || !form.newAssigneeId}
            loading={isLoading}
          >
            {t('tasks.delegate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
