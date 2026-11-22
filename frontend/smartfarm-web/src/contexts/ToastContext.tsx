import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastMessage = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => addToast(message, 'success', title), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast(message, 'error', title), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast(message, 'warning', title), [addToast]);
  const info = useCallback((message: string, title?: string) => addToast(message, 'info', title), [addToast]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="size-5 text-danger shrink-0" />,
    warning: <AlertTriangle className="size-5 text-warning shrink-0" />,
    info: <Info className="size-5 text-water shrink-0" />,
  };

  const borderStyles: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    error: 'border-danger-border bg-danger-subtle text-danger',
    warning: 'border-warning-border bg-warning-subtle text-amber-950',
    info: 'border-water-border bg-water-subtle text-sky-950',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-3 ${borderStyles[item.type]}`}
          >
            {icons[item.type]}
            <div className="flex-1 min-w-0">
              {item.title && <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{item.title}</p>}
              <p className="text-sm font-medium leading-relaxed break-words">{item.message}</p>
            </div>
            <button
              onClick={() => removeToast(item.id)}
              className="text-current/60 hover:text-current rounded p-0.5 focus-ring"
              aria-label="Đóng thông báo"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
