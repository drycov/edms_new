/**
 * Workflow Publish Feature - Model
 *
 * Domain types and business logic for workflow publication
 */

export interface WorkflowPublishForm {
  workflowId: string;
  publishNotes?: string;
}

export interface WorkflowPublishPayload {
  userId: string;
  organizationId: string;
  workflowId: string;
  notes?: string;
}

export interface WorkflowPublishedEvent {
  workflowId: string;
  workflowName: string;
  publishedBy: string;
  publishDate: string;
  notes?: string;
}

export class WorkflowPublishValidator {
  static validate(form: WorkflowPublishForm): string[] {
    const errors: string[] = [];

    if (!form.workflowId?.trim()) {
      errors.push('Workflow ID is required');
    }

    if (form.publishNotes && form.publishNotes.length > 5000) {
      errors.push('Publish notes must be less than 5,000 characters');
    }

    return errors;
  }

  static isValid(form: WorkflowPublishForm): boolean {
    return this.validate(form).length === 0;
  }
}
