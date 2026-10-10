import { NavLink } from 'react-router-dom';

export default function Sidebar({ session, profile, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠', path: '/dashboard' },
    { id: 'progress', label: 'Mi progreso', icon: '📊', path: '/progress' },
    { id: 'attendance', label: 'Asistencia', icon: '📋', path: '/attendance' },
    { id: 'courses', label: 'Mis clases', icon: '📚', path: '/courses' },
    { id: 'rewards', label: 'Recompensas', icon: '🎁', path: '/rewards' },
    { id: 'atlas', label: 'Compañero Digital', icon: '🤖', path: '/atlas' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 p-8 flex flex-col shadow-2xl overflow-y-auto text-white">
      {/* Logo */}
      <div className="mb-8">
        <NavLink
          to="/platform"
          className="group flex items-center gap-4 mb-3 rounded-[28px] bg-white/10 p-4 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-[0_18px_40px_-20px_rgba(255,255,255,0.35)]">
            🎓
          </div>
          <div>
            <p className="text-sm font-black text-white group-hover:text-emerald-50">INARA</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200 group-hover:text-emerald-100">Tu camino hacia el éxito</p>
          </div>
        </NavLink>
      </div>

      {/* Menu Principal */}
      <nav className="flex-1 space-y-3">
        <div className="mb-6">
          <NavLink
            to="/dashboard"
            className={({isActive}) => `w-full rounded-[24px] px-5 py-4 font-bold transition-all duration-300 flex items-center gap-4 ${isActive ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-white/15' : 'text-emerald-100 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
          >
            <span className="text-lg">🏠</span>
            <span>Inicio</span>
          </NavLink>
        </div>

        <div className="space-y-2">
          {menuItems.slice(1).map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({isActive}) => `w-full rounded-[24px] px-5 py-3 text-sm font-semibold transition-all duration-300 flex items-center gap-4 ${isActive ? 'bg-white/10 text-white border-l-4 border-emerald-300 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.5)]' : 'text-emerald-100 hover:bg-white/10 hover:text-white hover:translate-x-1'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Perfil */}
      {session?.user && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xl font-bold text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.4)]">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-emerald-200 uppercase tracking-[0.12em]">{session.user.role}</p>
            </div>
          </div>

          {typeof profile?.totalXp === 'number' && (
            <div className="flex items-center justify-between bg-white/10 rounded-[26px] p-4 ring-1 ring-white/10 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <p className="text-xs font-semibold text-emerald-100">XP</p>
              </div>
              <p className="font-extrabold text-white">{profile.totalXp.toLocaleString()}</p>
            </div>
          )}
          {typeof profile?.currentLevel === 'number' && (
            <div className="flex items-center gap-3 bg-white/10 rounded-[26px] px-4 py-3 ring-1 ring-white/10 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.25)]">
              <span className="text-lg">📊</span>
              <span className="text-xs font-bold text-white">Nivel {profile.currentLevel}</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full rounded-3xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-white/20 hover:scale-[1.01] shadow-[0_20px_50px_-30px_rgba(255,255,255,0.25)]"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Footer icons */}
      <div className="flex gap-3 justify-center mt-4 pt-4 border-t border-white/10">
        <button className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/15 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.45)]">
          ⚙️
        </button>
        <button className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/15 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.45)]">
          ❓
        </button>
        <button className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/15 transition-all duration-300 hover:-translate-y-0.5 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.45)]">
          📢
        </button>
      </div>
    </aside>
  );
}
