import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  async function submit() {
    if (!email || !token) {
      setMessage('El enlace de recuperación está incompleto. Solicita uno nuevo desde el inicio de sesión.');
      return;
    }
    if (password.length < 8 || password !== confirmPassword) {
      setMessage('Usa al menos 8 caracteres y confirma que ambas contraseñas coincidan.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ email, token, password })
      });
      setMessage(result.message || 'Contraseña actualizada.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border p-6 shadow-lg space-y-4">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="text-sm opacity-80">El enlace es válido durante 30 minutos y solo puede utilizarse una vez.</p>
        <label className="block text-sm font-medium" htmlFor="new-password">Nueva contraseña</label>
        <input id="new-password" className="w-full rounded-lg border px-3 py-2" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="block text-sm font-medium" htmlFor="confirm-password">Confirmar contraseña</label>
        <input id="confirm-password" className="w-full rounded-lg border px-3 py-2" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {message && <p role="status" className="text-sm">{message}</p>}
        <button type="button" onClick={submit} disabled={loading} className="w-full rounded-lg px-4 py-3 font-bold text-white bg-emerald-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</button>
        <button type="button" onClick={() => navigate('/auth')} className="w-full rounded-lg px-4 py-2 font-semibold">Volver al inicio de sesión</button>
      </section>
    </main>
  );
}
