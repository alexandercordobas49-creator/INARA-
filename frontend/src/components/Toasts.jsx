import { useToast } from '../contexts/ToastContext.jsx';
import { useEffect, useState } from 'react';

function Toast({ item, onClose }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(id);
  }, []);

  const icon = item.type === 'success' ? '✅' : item.type === 'error' ? '❌' : 'ℹ️';

  return (
    <div
      role="status"
      className={`max-w-sm w-full p-4 rounded-lg shadow-lg border transform ${entered ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'} transition-all duration-300 ${item.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : item.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg pt-0.5">{icon}</div>
        <div className="flex-1 text-sm">{item.text}</div>
        <button className="text-xs opacity-70 ml-3" onClick={() => onClose(item.id)}>Cerrar</button>
      </div>
    </div>
  );
}

export default function Toasts() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col-reverse gap-3">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onClose={removeToast} />
      ))}
    </div>
  );
}
