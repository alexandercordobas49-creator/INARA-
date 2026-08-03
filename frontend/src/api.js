const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getSession() {
  try {
    const saved = localStorage.getItem('INARA-session');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Sesión local inválida. Se eliminará automáticamente.');
    localStorage.removeItem('INARA-session');
    return null;
  }
}

export async function api(path, options = {}) {
  const session = getSession();
  const token = session?.token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {})
      }
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('INARA-session');
      }

      const messages = {
        400: 'La solicitud contiene datos inválidos.',
        401: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
        403: 'No tienes permisos para realizar esta acción.',
        404: 'No se encontró el recurso solicitado.',
        500: 'Ocurrió un error interno del servidor.'
      };

      throw new Error(messages[response.status] || data?.message || 'Ocurrió un error inesperado.');
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder.');
    }

    throw error;
  }
}

export function notify(type, text, timeout = 4000) {
  try {
    // If React provider set a global helper, prefer it (returns id)
    if (typeof window.__inara_notify === 'function') {
      try {
        return window.__inara_notify(type, text, timeout);
      } catch (e) {
        // fallback to DOM event below
      }
    }

    window.dispatchEvent(new CustomEvent('inara-toast', { detail: { type, text, timeout } }));
  } catch (e) {
    // ignore
  }
}