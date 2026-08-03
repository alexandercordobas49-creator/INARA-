import Sidebar from './Sidebar.jsx';
import Toasts from './Toasts.jsx';
import { ToastProvider } from '../contexts/ToastContext.jsx';

export default function AppShell({ modules, activeModule, onSelectModule, session, onLogout, children }) {
  const icons = {
    auth: '🏠',
    roles: '👥',
    attendance: '📋',
    dashboard: '📊',
    xp: '⚡',
    achievements: '🏆',
    atlas: '🤖',
    parents: '👨‍👩‍👧‍👦',
    routes: '🧭'
  };

  // Si hay sesión, mostrar layout con sidebar
  if (session) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50">
          <Sidebar 
            session={session} 
            onLogout={onLogout} 
          />
          <main className="ml-56 min-h-screen">
          <div className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
            <div className="relative flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent">
                    INARA
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-md">
                    Tu Camino Hacia el Exito
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 rounded-2xl hover:bg-slate-100 transition-all text-xl">🔔</button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {session.user?.firstName?.[0]}{session.user?.lastName?.[0]}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-emerald-300/40 via-slate-300/0 to-cyan-300/40" />
            </div>
          </div>
          <div className="p-8">{children}</div>
            <Toasts />
          </main>
        </div>
      </ToastProvider>
    );
  }

  // Si no hay sesión, mostrar layout simple (login)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {children}
    </div>
  );
}
