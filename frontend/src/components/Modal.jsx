import { useEffect } from 'react';

export default function Modal({ isOpen, title, message, actions, onClose, type = 'info' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const headerBg = {
    success: 'from-emerald-600 to-cyan-600',
    error: 'from-rose-600 to-red-600',
    warning: 'from-amber-600 to-orange-600',
    info: 'from-blue-600 to-cyan-600'
  }[type] || 'from-emerald-600 to-cyan-600';

  const headerIcon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || 'ℹ️';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
          {/* Header */}
          <div className={`bg-gradient-to-r ${headerBg} p-6`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{headerIcon}</span>
              <h2 className="text-xl font-black text-white">{title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-slate-600 leading-relaxed text-sm font-medium">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-slate-200 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-all"
            >
              Cerrar
            </button>
            {actions && actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.handler?.();
                  onClose();
                }}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  action.primary
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  );
}
