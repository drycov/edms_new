/**
 * Workflow Publish Feature - UI Component
 *
 * Reusable publish dialog component
 */

import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useTranslation } from 'react-i18next';
import { WorkflowPublishForm } from '../model/types';

interface WorkflowPublishDialogProps {
  isOpen: boolean;
  workflowId: string;
  workflowName?: string;
  isLoading?: boolean;
  onPublish: (form: WorkflowPublishForm) => Promise<void>;
  onClose: () => void;
}

export function WorkflowPublishDialog({
  isOpen,
  workflowId,
  workflowName = '',
  isLoading = false,
  onPublish,
  onClose,
}: WorkflowPublishDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');

  const handlePublish = async () => {
    await onPublish({
      workflowId,
      publishNotes: notes,
    });
    setNotes('');
    onClose();
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('workflows.publishWorkflow')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            Publishing this workflow will make it available for use. This action cannot be undone.
          </div>

          <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
            <strong>{workflowName}</strong>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('workflows.publishNotes')}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflows.publishNotes')}
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
            onClick={handlePublish}
            loading={isLoading}
          >
            {t('workflows.publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
