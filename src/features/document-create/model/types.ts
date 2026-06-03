/**
 * Document Create Feature - Model
 *
 * Domain types and business logic for document creation
 */

export interface DocumentCreateForm {
  title: string;
  description: string;
  content: string;
  documentTypeId: string | null;
  nomenclatureItemId: string | null;
  documentDate: string;
  isConfidential: boolean;
}

export interface DocumentCreatePayload {
  userId: string;
  organizationId: string;
  form: DocumentCreateForm;
}

export interface DocumentCreatedEvent {
  documentId: string;
  title: string;
  createdBy: string;
  timestamp: string;
}

export class DocumentCreateValidator {
  static validate(form: DocumentCreateForm): string[] {
    const errors: string[] = [];

    if (!form.title?.trim()) {
      errors.push('Title is required');
    }

    if (form.title && form.title.length > 500) {
      errors.push('Title must be less than 500 characters');
    }

    if (form.content && form.content.length > 100000) {
      errors.push('Content must be less than 100,000 characters');
    }

    if (form.description && form.description.length > 2000) {
      errors.push('Description must be less than 2,000 characters');
    }

    return errors;
  }

  static isValid(form: DocumentCreateForm): boolean {
    return this.validate(form).length === 0;
  }
}
