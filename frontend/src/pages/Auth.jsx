import { useState, useMemo } from 'react';
import { api, notify } from '../api.js';

export default function Auth({ onSession }) {
  const [loginForm, setLoginForm] = useState({ email: 'valeria@INARA.test', password: 'demo123' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  function passwordStrength(pw) {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0..4
  }

  const loginValid = useMemo(() => {
    return validateEmail(loginForm.email) && loginForm.password.trim().length > 0;
  }, [loginForm]);

  const registerValid = useMemo(() => {
    return (
      registerForm.firstName.trim().length > 0 &&
      registerForm.lastName.trim().length > 0 &&
      validateEmail(registerForm.email) &&
      registerForm.password.length >= 8 &&
      registerForm.password === registerForm.confirmPassword
    );
  }, [registerForm]);

  async function login() {
    try {
      if (!loginValid) {
        setMessage('Completa email y contraseña correctamente');
        notify('error', 'Completa email y contraseña correctamente');
        return;
      }

      const session = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      setMessage('Sesión iniciada.');
      notify('success', 'Sesión iniciada.');
      onSession(session);
    } catch (error) {
      setMessage(error.message);
      notify('error', error.message || 'Error iniciando sesión');
    }
  }

  async function register() {
    try {
      if (!registerValid) {
        setMessage('Revisa los datos del formulario.');
        notify('error', 'Revisa los datos del formulario.');
        return;
      }

      const session = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });

      setMessage('Cuenta creada.');
      notify('success', 'Cuenta creada.');
      onSession(session);
    } catch (error) {
      setMessage(error.message);
      notify('error', error.message || 'Error creando cuenta');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10 grid lg:grid-cols-3 gap-6 p-6 sm:p-8 max-w-7xl mx-auto">
        {/* PANEL IZQUIERDO - BIENVENIDA */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-800/80 via-blue-900/50 to-slate-800/80 rounded-[2rem] p-8 border border-emerald-500/30 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 text-7xl">🎓</div>
          <div className="relative z-10">
            
            
            <h1 className="text-4xl font-bold text-slate-200 mb-2">Bienvenido a</h1>
            <h2 className="text-6xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent mb-4">INARA</h2>
            <p className="text-emerald-300/80 italic text-lg font-semibold mb-8">Tu camino hacia el éxito</p>
            
            <div className="space-y-5 my-8 border-t border-emerald-500/20 pt-8">
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">📚</span>
                <div>
                  <p className="font-bold text-emerald-300">Aprende</p>
                  <p className="text-sm text-slate-400">Contenido estructurado y personalizado</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">📈</span>
                <div>
                  <p className="font-bold text-emerald-300">Crece</p>
                  <p className="text-sm text-slate-400">Gana XP y sube de nivel</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">🎯</span>
                <div>
                  <p className="font-bold text-emerald-300">Logra</p>
                  <p className="text-sm text-slate-400">Desbloquea logros y reconocimientos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-700/50 to-violet-900/30 border border-violet-500/30 rounded-2xl p-5 mt-8 backdrop-blur">
              <div className="flex gap-3">
                <span className="text-5xl flex-shrink-0">🤖</span>
                <div>
                  <p className="font-bold text-violet-300">Con IA que te acompaña</p>
                  <p className="text-xs text-slate-300">Seguimiento, motivación y éxito académico en un solo lugar</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANELES DERECHOS */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {/* PANEL LOGIN */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-[2rem] p-8 border border-emerald-500/20 backdrop-blur shadow-2xl hover:border-emerald-500/40 transition-all">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-full">
                <span className="text-5xl">🔐</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-100 mb-1">Iniciar sesión</h3>
            <p className="text-center text-slate-400 mb-8 font-medium text-sm">Accede a tu cuenta</p>
            
            {message && <div className="mb-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl font-semibold text-center text-sm">{message}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">📧 Email</label>
                <input 
                  className={`w-full rounded-xl border px-4 py-3 font-medium focus:outline-none transition-all ${validateEmail(loginForm.email) ? 'border-emerald-500 focus:ring-emerald-500/30 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`}
                  placeholder="tu@email.com"
                  value={loginForm.email} 
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} 
                />
                {!validateEmail(loginForm.email) && (
                  <p className="mt-2 text-xs text-red-400">Formato de correo inválido</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">🔒 Contraseña</label>
                <div className="relative">
                  <input
                    className={`w-full rounded-xl border px-4 py-3 font-medium focus:outline-none transition-all ${loginForm.password ? 'border-emerald-500 focus:ring-emerald-500/30 bg-slate-700/50 text-slate-100' : 'border-slate-600 bg-slate-700/50 text-slate-100'}`}
                    type={loginShowPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  />
                  <button type="button" className="absolute right-3 top-3 text-sm text-slate-300" onClick={() => setLoginShowPassword((v) => !v)}>{loginShowPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-emerald-500" />
                <label htmlFor="remember" className="text-sm font-medium text-slate-300">Recuérdame</label>
              </div>
              <button className={`w-full rounded-xl px-6 py-4 font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg ${loginValid ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 active:scale-95' : 'bg-slate-700/40 cursor-not-allowed'}`} type="button" onClick={login} disabled={!loginValid}>
                🚀 Entrar a INARA
              </button>
              <p className="text-center text-xs text-slate-400">¿Olvidaste tu contraseña? <a href="#" className="font-bold text-emerald-400 hover:text-emerald-300 transition">Recupérala aquí</a></p>
            </div>
          </div>

          {/* PANEL REGISTRO */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-[2rem] p-8 border border-violet-500/20 backdrop-blur shadow-2xl hover:border-violet-500/40 transition-all">
            <div className="flex justify-center mb-6">
              <div className="bg-violet-500/20 border border-violet-500/40 p-4 rounded-full">
                <span className="text-5xl">👤</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-100 mb-1">Crear cuenta</h3>
            <p className="text-center text-slate-400 mb-6 font-medium text-sm">Registrate y comienza tu viaje</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">👤 Nombre</label>
                  <input className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 placeholder-slate-500 transition-all" placeholder="Juan" value={registerForm.firstName} onChange={(event) => setRegisterForm({ ...registerForm, firstName: event.target.value })} />
                  {registerForm.firstName.trim().length === 0 && <p className="mt-1 text-xs text-red-400">Campo requerido</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">👤 Apellido</label>
                  <input className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 placeholder-slate-500 transition-all" placeholder="Pérez" value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} />
                  {registerForm.lastName.trim().length === 0 && <p className="mt-1 text-xs text-red-400">Campo requerido</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">📧 Correo electrónico</label>
                <input className={`w-full rounded-lg border px-3 py-2 font-medium transition-all ${validateEmail(registerForm.email) ? 'border-violet-500 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`} placeholder="tu@email.com" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
                {!validateEmail(registerForm.email) && registerForm.email.length > 0 && <p className="mt-1 text-xs text-red-400">Formato de correo inválido</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">🔒 Contraseña</label>
                <div className="relative">
                  <input className={`w-full rounded-lg border px-3 py-2 font-medium transition-all ${registerForm.password.length >= 8 ? 'border-violet-500 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`} type={registerShowPassword ? 'text' : 'password'} placeholder="••••••••" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} />
                  <button type="button" className="absolute right-3 top-2 text-xs text-slate-300" onClick={() => setRegisterShowPassword((v) => !v)}>{registerShowPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
                <div className="mt-2 h-2 w-full bg-slate-700/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${(() => {
                    const s = passwordStrength(registerForm.password);
                    if (s <= 1) return 'w-1/4 bg-red-500';
                    if (s === 2) return 'w-2/4 bg-amber-400';
                    if (s === 3) return 'w-3/4 bg-emerald-400';
                    return 'w-full bg-emerald-600';
                  })()}`} style={{ width: `${(passwordStrength(registerForm.password) / 4) * 100}%` }} />
                </div>
                {registerForm.password.length > 0 && registerForm.password.length < 8 && <p className="mt-1 text-xs text-red-400">La contraseña debe tener al menos 8 caracteres</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">🔒 Confirmar contraseña</label>
                <input className={`w-full rounded-lg border px-3 py-2 font-medium transition-all ${registerForm.confirmPassword === registerForm.password ? 'border-violet-500 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`} type={registerShowPassword ? 'text' : 'password'} placeholder="••••••••" value={registerForm.confirmPassword} onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })} />
                {registerForm.confirmPassword.length > 0 && registerForm.confirmPassword !== registerForm.password && <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">👥 Rol</label>
                <select className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 transition-all" value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                  <option value="student" className="bg-slate-800">👨‍🎓 Estudiante</option>
                  <option value="instructor" className="bg-slate-800">👨‍🏫 Docente</option>
                  <option value="admin" className="bg-slate-800">⚙️ Administrador</option>
                  <option value="parent" className="bg-slate-800">👪 Padre/Tutor</option>
                </select>
              </div>
              <button className={`w-full rounded-lg px-4 py-3 font-bold text-white shadow-lg transition-all duration-300 ${registerValid ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-xl hover:shadow-violet-600/40 hover:scale-105 active:scale-95' : 'bg-slate-700/40 cursor-not-allowed'}`} type="button" onClick={register} disabled={!registerValid}>
                ✨ Crear cuenta
              </button>
              <p className="text-center text-xs text-slate-400">¿Ya tienes cuenta? <a href="#" className="font-bold text-violet-400 hover:text-violet-300 transition">Inicia aquí</a></p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAJO PANELES */}
      <footer className="mt-8 max-w-7xl mx-auto text-center text-sm text-slate-400">
        <div className="py-4 border-t border-emerald-500/10">
          <a href="/help" className="mx-3 hover:text-emerald-300">Ayuda</a>
          <a href="/terms" className="mx-3 hover:text-emerald-300">Términos</a>
          <a href="/privacy" className="mx-3 hover:text-emerald-300">Privacidad</a>
          <a href="/contact" className="mx-3 hover:text-emerald-300">Contacto</a>
        </div>
      </footer>

    </div>
  );
}
