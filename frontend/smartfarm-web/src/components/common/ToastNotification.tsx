import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, type, title, message }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  const success = useCallback(
    (title: string, message?: string) => showToast('success', title, message),
    [showToast]
  )
  const error = useCallback(
    (title: string, message?: string) => showToast('error', title, message),
    [showToast]
  )
  const warning = useCallback(
    (title: string, message?: string) => showToast('warning', title, message),
    [showToast]
  )
  const info = useCallback(
    (title: string, message?: string) => showToast('info', title, message),
    [showToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icon = {
            success: <CheckCircle2 className="size-5 text-[#16a34a] shrink-0" />,
            error: <AlertCircle className="size-5 text-[#dc2626] shrink-0" />,
            warning: <AlertTriangle className="size-5 text-[#d97706] shrink-0" />,
            info: <Info className="size-5 text-[#0284c7] shrink-0" />,
          }[toast.type]

          return (
            <div
              key={toast.id}
              role="alert"
              className="pointer-events-auto rounded-xl border border-[#e5eae5] bg-white p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-150"
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#17251d]">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-[#647067] mt-0.5">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[#8a968d] hover:text-[#17251d] p-0.5 rounded cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

