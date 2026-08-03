import React, { useState, useEffect } from 'react';
import { NotificationService, type ToastMessage } from '../../services/NotificationService';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((list) => {
      setToasts(list);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-fade-in transition-all ${
              toast.type === 'success'
                ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-slate-900/90 border-rose-500/30 text-rose-400'
                : toast.type === 'warning'
                ? 'bg-slate-900/90 border-amber-500/30 text-amber-400'
                : 'bg-slate-900/90 border-indigo-500/30 text-indigo-400'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-xs text-slate-100">{toast.title}</h5>
              {toast.message && <p className="text-[11px] text-slate-400 mt-0.5">{toast.message}</p>}
            </div>

            <button
              onClick={() => NotificationService.dismiss(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
