import { toast } from '@/shared/ui/toaster';

export interface AppError extends Error {
  code?: string;
  context?: string;
}

export function createAppError(message: string, code?: string, context?: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.context = context;
  return error;
}

export function handleError(error: unknown, defaultMessage?: string): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('Not authenticated')) {
      return 'Session expired. Please log in again.';
    }
    if (message.includes('No organization')) {
      return 'Organization not found.';
    }
    if (message.includes('already exists')) {
      return 'This item already exists.';
    }
    if (message.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
    return message;
  }
  return defaultMessage || 'An unexpected error occurred.';
}

export function showErrorToast(error: unknown, defaultMessage?: string): void {
  const message = handleError(error, defaultMessage);
  toast.error('Error', message);
}

export function showSuccessToast(title: string, message?: string): void {
  toast.success(title, message);
}

export function showWarningToast(title: string, message?: string): void {
  toast.warning(title, message);
}
