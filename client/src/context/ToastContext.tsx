import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000); // 5 seconds duration
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] pointer-events-auto transform transition-all duration-300 ease-in-out
              ${toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-gray-800' : ''}
              ${toast.type === 'error' ? 'bg-white border-l-4 border-red-500 text-gray-800' : ''}
              ${toast.type === 'info' ? 'bg-slate-800 text-white' : ''}
            `}
          >
            <div className="shrink-0">
              {toast.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
              {toast.type === 'info' && <Info size={20} className="text-blue-400" />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-gray-100/10 rounded-full transition-colors opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
