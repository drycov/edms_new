/**
 * Document Approve Feature - UI Component
 *
 * Reusable approval dialog component
 */

import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useTranslation } from 'react-i18next';
import { DocumentApprovalForm } from '../model/types';

interface DocumentApprovalDialogProps {
  isOpen: boolean;
  documentId: string;
  documentTitle?: string;
  isLoading?: boolean;
  onApprove: (form: DocumentApprovalForm) => Promise<void>;
  onReject: (documentId: string, reason: string) => Promise<void>;
  onClose: () => void;
}

export function DocumentApprovalDialog({
  isOpen,
  documentId,
  documentTitle = '',
  isLoading = false,
  onApprove,
  onReject,
  onClose,
}: DocumentApprovalDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');

  const handleApprove = async () => {
    await onApprove({
      documentId,
      approvalNotes: notes,
      approvalDate: new Date().toISOString().split('T')[0],
    });
    setNotes('');
    onClose();
  };

  const handleReject = async () => {
    await onReject(documentId, notes);
    setNotes('');
    onClose();
  };

  const handleClose = () => {
    setNotes('');
    setMode('approve');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'approve' ? t('documents.approveDocument') : t('documents.rejectDocument')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
            <strong>{documentTitle}</strong>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={mode === 'approve' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('approve')}
              disabled={isLoading}
            >
              {t('documents.approve')}
            </Button>
            <Button
              type="button"
              variant={mode === 'reject' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('reject')}
              disabled={isLoading}
            >
              {t('documents.reject')}
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'approve' ? t('documents.approvalNotes') : t('documents.rejectionReason')}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === 'approve'
                  ? t('documents.approvalNotes')
                  : t('documents.rejectionReason')
              }
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
            variant={mode === 'approve' ? 'default' : 'destructive'}
            onClick={mode === 'approve' ? handleApprove : handleReject}
            loading={isLoading}
          >
            {mode === 'approve' ? t('documents.approve') : t('documents.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
