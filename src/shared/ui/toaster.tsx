import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const colors: Record<ToastType, string> = {
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-blue-200 bg-blue-50',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed right-0 top-0 z-50 flex flex-col gap-2 p-4 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
              colors[toast.type]
            )}
          >
            {icons[toast.type]}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-sm text-gray-600">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const toast = {
  success: (title: string, description?: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', title, description } })),
  error: (title: string, description?: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', title, description } })),
  warning: (title: string, description?: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'warning', title, description } })),
  info: (title: string, description?: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', title, description } })),
};
