/**
 * Document Create Form - Enterprise EDMS
 * 
 * Production-ready форма создания документа
 */

import { useForm, Controller } from 'react-hook-form';
import { DocumentCreateForm, DocumentCreateValidator } from '../model/types';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Loader2, X } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import RichTextEditor from '@/shared/ui/rich-text-editor';

interface DocumentCreateFormProps {
  onSubmit: (form: DocumentCreateForm) => Promise<void>;
  isLoading?: boolean;
  documentTypes?: Array<{ id: string; name: string; code: string }>;
  nomenclatureItems?: Array<{ id: string; code: string; title: string }>;
  onCancel?: () => void;
  defaultValues?: Partial<DocumentCreateForm>;
}

export function DocumentCreateFormComponent({
  onSubmit,
  isLoading = false,
  documentTypes = [],
  nomenclatureItems = [],
  onCancel,
  defaultValues,
}: DocumentCreateFormProps) {
  const { t } = useTranslation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<DocumentCreateForm>({
    defaultValues: {
      title: '',
      description: '',
      content: '',
      documentTypeId: '',
      nomenclatureItemId: '',
      documentDate: new Date().toISOString().split('T')[0],
      isConfidential: false,
      ...defaultValues,
    },
  });

  const onFormSubmit = async (data: DocumentCreateForm) => {
    // Валидация через ваш существующий валидатор
    const validationErrors = DocumentCreateValidator.validate(data);

    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => {
        // Простая обработка ошибок (можно улучшить под конкретные поля)
        setError('root', { type: 'manual', message: err });
      });
      return;
    }

    try {
      await onSubmit(data);
    } catch (err: any) {
      setError('root', {
        type: 'server',
        message: err?.message || t('common.errorOccurred'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('documents.createNewDocument')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Глобальная ошибка */}
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('documents.title_field')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={t('documents.title_placeholder')}
              disabled={isLoading}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('documents.description_field')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('documents.description_placeholder')}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Type + Nomenclature */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentTypeId">{t('common.type')}</Label>
              <Controller
                name="documentTypeId"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`-- ${t('common.select')} --`} />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>
                          {dt.name} {dt.code && `(${dt.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.documentTypeId && (
                <p className="text-sm text-red-500">{errors.documentTypeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomenclatureItemId">{t('nomenclature.title')}</Label>
              <Controller
                name="nomenclatureItemId"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`-- ${t('common.select')} --`} />
                    </SelectTrigger>
                    <SelectContent>
                      {nomenclatureItems.map((ni) => (
                        <SelectItem key={ni.id} value={ni.id}>
                          {ni.code} — {ni.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Date + Confidential */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentDate">{t('common.date')}</Label>
              <Input
                id="documentDate"
                type="date"
                {...register('documentDate')}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center pt-8">
              <Controller
                name="isConfidential"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="isConfidential"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                    <Label htmlFor="isConfidential" className="cursor-pointer font-medium">
                      {t('archive.legalHold') || t('documents.confidential')}
                    </Label>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Content — Rich Text Editor */}
          <div className="space-y-2">
            <Label>{t('documents.content')}</Label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder={t('documents.content_placeholder')}
                  disabled={isLoading}
                  minHeight={320}
                />
              )}
            />
            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            {t('common.cancel')}
          </Button>
        )}

        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {t('documents.createDocument')}
        </Button>
      </div>
    </form>
  );
}