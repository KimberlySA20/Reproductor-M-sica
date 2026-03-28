import React from 'react'
import { useToast } from '@/hooks/use-toast'

export const Toaster: React.FC = () => {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-card border rounded-lg shadow-lg p-4 min-w-[300px]"
        >
          <div className="font-medium">{toast.title}</div>
          {toast.description && (
            <div className="text-sm text-muted-foreground mt-1">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}
