import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, text, timeout = 4000) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 9);
    const item = { id, type, text };
    setToasts((t) => [item, ...t]);

    if (timeout > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, timeout);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Expose a global helper for non-react modules (backwards compatibility)
  useEffect(() => {
    const prev = window.__inara_notify;
    window.__inara_notify = addToast;
    return () => {
      if (window.__inara_notify === addToast) {
        window.__inara_notify = prev;
      }
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider');
  return ctx;
}
