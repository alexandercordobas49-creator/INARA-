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
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

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
    if (loginLoading) return;

    try {
      if (!loginValid) {
        setMessage('Completa email y contraseña correctamente');
        notify('error', 'Completa email y contraseña correctamente');
        return;
      }

      setLoginLoading(true);
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
    } finally {
      setLoginLoading(false);
    }
  }

  async function register() {
    if (registerLoading) return;

    try {
      if (!registerValid) {
        setMessage('Revisa los datos del formulario.');
        notify('error', 'Revisa los datos del formulario.');
        return;
      }

      setRegisterLoading(true);
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
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="auth-page min-h-screen relative overflow-hidden">
      {/* CONTENEDOR PRINCIPAL */}
      <div className="auth-layout relative z-10 grid lg:grid-cols-3 gap-4 p-4 sm:p-6 max-w-5xl mx-auto">
        {/* PANEL IZQUIERDO - BIENVENIDA */}
        <div className="auth-card auth-card--intro lg:col-span-1 rounded-2xl p-6 sm:p-7 border relative overflow-hidden">
          <div className="relative z-10">
            <div className="auth-brand">
              <img src="/assets/logo-INARA.png?v=20260915" alt="INARA" className="auth-brand__logo" />
              <span className="auth-brand__deco" aria-hidden="true">🎓</span>
              <span className="auth-brand__welcome">Bienvenido a</span>
              <div className="auth-brand__name"><span>INA</span><span className="auth-brand__suffix">RA</span></div>
              <p>Tu camino hacia el éxito académico</p>
            </div>
            
            <div className="auth-journey my-6 border-t pt-6">
              <div className="auth-journey__step">
                <span className="auth-benefit-icon flex-shrink-0">📚</span>
                <div>
                  <p className="font-bold">Aprende</p>
                  <p className="text-sm">Contenido estructurado de alta calidad diseñado para tu ritmo.</p>
                </div>
              </div>
              <div className="auth-journey__connector" aria-hidden="true"></div>
              <div className="auth-journey__step">
                <span className="auth-benefit-icon flex-shrink-0">📈</span>
                <div>
                  <p className="font-bold">Crece</p>
                  <p className="text-sm">Sigue tu progreso académico, gana XP y sube de nivel.</p>
                </div>
              </div>
              <div className="auth-journey__connector" aria-hidden="true"></div>
              <div className="auth-journey__step">
                <span className="auth-benefit-icon flex-shrink-0">🎯</span>
                <div>
                  <p className="font-bold">Logra</p>
                  <p className="text-sm">Alcanza tus objetivos y desbloquea insignias de excelencia.</p>
                </div>
              </div>
            </div>

            <div className="auth-ai rounded-xl p-4 mt-7">
              <div className="flex gap-3">
                <span className="auth-ai__icon text-3xl flex-shrink-0">🤖</span>
                <div>
                  <p className="font-bold">Siempre hay un siguiente paso.</p>
                  <p className="text-xs">INARA analiza tu progreso y te ayuda a identificar cómo avanzar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANELES DERECHOS */}
        <div className="auth-forms lg:col-span-2 grid md:grid-cols-2 gap-4">
          {/* PANEL LOGIN */}
          <div className="auth-card auth-card--form auth-card--login rounded-2xl p-6 sm:p-7 border transition-all">
            <div className="auth-login-heading">
              <div className="auth-form-icon" aria-hidden="true">
                <span className="auth-emoji-icon">🔐</span>
              </div>
              <div className="auth-card-kicker">ACCESO SEGURO</div>
              <h3 className="text-2xl font-bold text-center mb-1">Iniciar sesión</h3>
              <p className="text-center mb-5 font-medium text-sm">Accede a tu cuenta</p>
            </div>
            {message && <div className="auth-form-message mb-4" role="status">{message}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="auth-label block text-sm font-bold mb-2"><span className="auth-field-icon" aria-hidden="true">📧</span> Email</label>
                <input 
                  className={`auth-input w-full rounded-xl border px-4 py-3 font-medium focus:outline-none transition-all ${validateEmail(loginForm.email) ? 'border-emerald-500' : 'border-red-400'}`}
                  type="email"
                  placeholder="tu@email.com"
                  value={loginForm.email} 
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} 
                />
                {!validateEmail(loginForm.email) && (
                  <p className="mt-2 text-xs text-red-400">Formato de correo inválido</p>
                )}
              </div>
              <div>
                <label className="auth-label block text-sm font-bold mb-2"><span className="auth-field-icon" aria-hidden="true">🔒</span> Contraseña</label>
                <div className="relative">
                  <input
                    className={`auth-input w-full rounded-xl border px-4 py-3 font-medium focus:outline-none transition-all ${loginForm.password ? 'border-emerald-500' : 'border-slate-300'}`}
                    type={loginShowPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  />
                  <button type="button" className="auth-toggle absolute right-3 top-3 text-sm" onClick={() => setLoginShowPassword((v) => !v)}>{loginShowPassword ? 'Ocultar' : 'Mostrar'}</button>
                </div>
              </div>
              <div className="auth-login-options flex items-center justify-between gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-emerald-500" />
                <label htmlFor="remember" className="text-sm font-medium">Recuérdame</label>
              </div>
              <button className={`auth-button w-full rounded-xl px-6 py-4 font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg ${loginValid && !loginLoading ? '' : 'is-disabled'}`} type="button" onClick={login} disabled={!loginValid || loginLoading}>
                <span className={`auth-button__icon ${loginLoading ? 'auth-button__icon--loading' : ''}`} aria-hidden="true">{loginLoading ? '◌' : '🚀'}</span> {loginLoading ? 'Entrando...' : 'Entrar a INARA'}
              </button>
              <p className="auth-recovery text-center text-xs"><a href="#" className="font-bold transition">¿Olvidaste tu contraseña? Recupérala aquí</a></p>
              <p className="auth-muted text-center text-xs">¿No tienes una cuenta? <a href="#" className="font-bold transition">Créala en la siguiente sección</a></p>
            </div>
          </div>

          {/* PANEL REGISTRO */}
          <div className="auth-card auth-card--form auth-card--register rounded-2xl p-6 sm:p-7 border transition-all">
            <div className="flex justify-center mb-6">
              <div className="auth-form-icon">
                <span className="auth-emoji-icon">🧑‍🎓</span>
              </div>
            </div>
            <div className="auth-card-kicker">EMPIEZA TU VIAJE</div>
            <h3 className="text-2xl font-bold text-center mb-1">Comienza tu camino</h3>
            <p className="text-center mb-5 font-medium text-sm">Crea tu cuenta y empieza a construir tu progreso.</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">👤</span> Nombre</label>
                  <input className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 placeholder-slate-500 transition-all" placeholder="Juan" value={registerForm.firstName} onChange={(event) => setRegisterForm({ ...registerForm, firstName: event.target.value })} />
                  {registerForm.firstName.trim().length === 0 && <p className="mt-1 text-xs text-red-400">Campo requerido</p>}
                </div>
                <div>
                  <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">👤</span> Apellido</label>
                  <input className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 placeholder-slate-500 transition-all" placeholder="Pérez" value={registerForm.lastName} onChange={(event) => setRegisterForm({ ...registerForm, lastName: event.target.value })} />
                  {registerForm.lastName.trim().length === 0 && <p className="mt-1 text-xs text-red-400">Campo requerido</p>}
                </div>
              </div>
              <div>
                <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">📧</span> Correo electrónico</label>
                <input className={`w-full rounded-lg border px-3 py-2 font-medium transition-all ${validateEmail(registerForm.email) ? 'border-violet-500 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`} placeholder="tu@email.com" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
                {!validateEmail(registerForm.email) && registerForm.email.length > 0 && <p className="mt-1 text-xs text-red-400">Formato de correo inválido</p>}
              </div>
              <div>
                <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">🔒</span> Contraseña</label>
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
                <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">🔒</span> Confirmar contraseña</label>
                <input className={`w-full rounded-lg border px-3 py-2 font-medium transition-all ${registerForm.confirmPassword === registerForm.password ? 'border-violet-500 bg-slate-700/50 text-slate-100' : 'border-red-400 bg-slate-700/50 text-slate-100'}`} type={registerShowPassword ? 'text' : 'password'} placeholder="••••••••" value={registerForm.confirmPassword} onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })} />
                {registerForm.confirmPassword.length > 0 && registerForm.confirmPassword !== registerForm.password && <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden</p>}
              </div>
              <div>
                <label className="auth-label block text-xs font-bold mb-1"><span className="auth-field-icon" aria-hidden="true">🎓</span> Rol</label>
                <select className="w-full rounded-lg border border-slate-600 px-3 py-2 font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 bg-slate-700/50 text-slate-100 transition-all" value={registerForm.role} onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}>
                  <option value="student" className="bg-slate-800">👨‍🎓 Estudiante</option>
                  <option value="instructor" className="bg-slate-800">👨‍🏫 Docente</option>
                  <option value="parent" className="bg-slate-800">👪 Padre/Tutor</option>
                </select>
              </div>
              <button className={`auth-button w-full rounded-lg px-4 py-3 font-bold text-white shadow-lg transition-all duration-300 ${registerValid && !registerLoading ? '' : 'is-disabled'}`} type="button" onClick={register} disabled={!registerValid || registerLoading}>
                <span className={`auth-button__icon ${registerLoading ? 'auth-button__icon--loading' : ''}`} aria-hidden="true">{registerLoading ? '◌' : '✨'}</span> {registerLoading ? 'Creando...' : 'Crear cuenta'}
              </button>
              <p className="text-center text-xs text-slate-400">¿Ya tienes cuenta? <a href="#" className="font-bold text-violet-400 hover:text-violet-300 transition">Inicia aquí</a></p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAJO PANELES */}
      <footer className="auth-footer max-w-5xl mx-auto text-center">
        <p className="auth-footer__security">Centro Tecnológico Bidkar Muñoz · Granada</p>
        <p className="auth-footer__institution"><span className="auth-footer__author">Colonial Code</span> · <span className="auth-footer__brand">INARA</span> · <span className="auth-footer__copyright">© 2026</span></p>
      </footer>

    </div>
  );
}
