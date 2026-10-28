import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Rewards({ selectedStudent }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!selectedStudent?.id) {
        setDashboard(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await api(`/dashboard/student/${selectedStudent.id}`);
        if (active) setDashboard(result);
      } catch (err) {
        if (active) setError(err.message || 'No se pudieron cargar las recompensas reales.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [selectedStudent?.id]);

  if (!selectedStudent) {
    return <main className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">No hay un estudiante seleccionado.</main>;
  }

  if (loading) {
    return <main className="animate-pulse space-y-4"><div className="h-28 rounded-3xl bg-emerald-100" /><div className="h-40 rounded-2xl bg-slate-100" /></main>;
  }

  if (error) {
    return <main className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><h1 className="text-xl font-bold">No se pudieron cargar las recompensas</h1><p className="mt-2">{error}</p></main>;
  }

  const xp = Number(dashboard?.xp?.total ?? 0);
  const achievements = Array.isArray(dashboard?.achievements) ? dashboard.achievements : [];
  const firstName = selectedStudent.firstName || selectedStudent.first_name || 'estudiante';

  return (
    <main className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-600 p-7 text-white shadow-lg md:p-9">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-100">Gamificación basada en actividad real</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Recompensas de {firstName}</h1>
        <p className="mt-3 max-w-2xl text-emerald-50">Los puntos y logros se muestran únicamente cuando existe actividad registrada y verificada en PostgreSQL.</p>
        <div className="mt-6 inline-flex rounded-2xl border border-white/20 bg-white/10 px-5 py-3">
          <span className="text-2xl font-extrabold">{xp.toLocaleString('es-NI')} XP</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Logros obtenidos</h2>
            <p className="mt-1 text-sm text-slate-500">Reconocimientos derivados de actividad real.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">{achievements.length} registrados</span>
        </div>
        {achievements.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay logros verificados para esta cuenta. Cuando se registren asistencias o actividades reales, aquí aparecerán sus recompensas. No se muestran medallas de ejemplo.</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {achievements.map((achievement) => (
              <article key={achievement.id} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
                <p className="text-lg font-bold text-slate-900">{achievement.name}</p>
                <p className="mt-2 text-sm text-slate-600">{achievement.description}</p>
                <p className="mt-3 text-sm font-bold text-emerald-800">+{achievement.xpReward} XP</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
