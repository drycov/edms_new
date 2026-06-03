/**
 * Task Delegate Feature - Model
 *
 * Domain types and business logic for task delegation
 */

export interface TaskDelegationForm {
  taskId: string;
  newAssigneeId: string;
  reason?: string;
}

export interface TaskDelegationPayload {
  userId: string;
  taskId: string;
  newAssigneeId: string;
  reason?: string;
}

export interface TaskDelegatedEvent {
  taskId: string;
  delegatedFrom: string;
  delegatedTo: string;
  reason?: string;
  timestamp: string;
}

export class TaskDelegationValidator {
  static validate(form: TaskDelegationForm): string[] {
    const errors: string[] = [];

    if (!form.taskId?.trim()) {
      errors.push('Task ID is required');
    }

    if (!form.newAssigneeId?.trim()) {
      errors.push('New assignee is required');
    }

    if (form.reason && form.reason.length > 2000) {
      errors.push('Delegation reason must be less than 2,000 characters');
    }

    return errors;
  }

  static isValid(form: TaskDelegationForm): boolean {
    return this.validate(form).length === 0;
  }
}
