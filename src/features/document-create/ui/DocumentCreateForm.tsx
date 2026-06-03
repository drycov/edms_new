/**
 * Document Create Feature - UI Component
 *
 * Reusable form component for creating documents
 */

import React, { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select } from '@/shared/ui/select';
import { useTranslation } from 'react-i18next';
import { DocumentCreateForm, DocumentCreateValidator } from '../model/types';

interface DocumentCreateFormProps {
  onSubmit: (form: DocumentCreateForm) => Promise<void>;
  isLoading?: boolean;
  documentTypes?: Array<{ id: string; name: string; code: string }>;
  nomenclatureItems?: Array<{ id: string; code: string; title: string }>;
  onCancel?: () => void;
}

export function DocumentCreateFormComponent({
  onSubmit,
  isLoading = false,
  documentTypes = [],
  nomenclatureItems = [],
  onCancel,
}: DocumentCreateFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DocumentCreateForm>({
    title: '',
    description: '',
    content: '',
    documentTypeId: '',
    nomenclatureItemId: '',
    documentDate: new Date().toISOString().split('T')[0],
    isConfidential: false,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = DocumentCreateValidator.validate(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t('documents.documentDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('documents.title_field')} <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('documents.title_field')}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('documents.description_field')}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('documents.description_field')}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.type')}
              </label>
              <Select
                value={form.documentTypeId}
                onChange={(e) => setForm({ ...form, documentTypeId: e.target.value })}
                disabled={isLoading}
              >
                <option value="">-- {t('common.select')} --</option>
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('nomenclature.title')}
              </label>
              <Select
                value={form.nomenclatureItemId}
                onChange={(e) => setForm({ ...form, nomenclatureItemId: e.target.value })}
                disabled={isLoading}
              >
                <option value="">-- {t('common.select')} --</option>
                {nomenclatureItems.map((ni) => (
                  <option key={ni.id} value={ni.id}>
                    {ni.code} - {ni.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.date')}
              </label>
              <Input
                type="date"
                value={form.documentDate}
                onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isConfidential}
                  onChange={(e) => setForm({ ...form, isConfidential: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isLoading}
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('archive.legalHold')}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('documents.content')}
            </label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={t('documents.content')}
              rows={10}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isLoading}>
          {t('documents.createDocument')}
        </Button>
      </div>
    </form>
  );
}
