import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const number = (value) => Number(value || 0);
const pct = (part, total) => total ? Math.round((part / total) * 100) : 0;

export default function Progress({ session, selectedStudent }) {
  const [dashboard, setDashboard] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedStudent?.id) { setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const [summary, records] = await Promise.all([
          api(`/dashboard/student/${selectedStudent.id}`),
          api(`/attendance?userId=${encodeURIComponent(selectedStudent.id)}`)
        ]);
        if (!alive) return;
        setDashboard(summary);
        setAttendance(Array.isArray(records) ? records : []);
      } catch (e) {
        if (alive) setError(e.message || 'No se pudo cargar el progreso real.');
      } finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, [selectedStudent?.id]);

  const stats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(r => r.status === 'present').length;
    const late = attendance.filter(r => r.status === 'late').length;
    const excused = attendance.filter(r => r.status === 'excused').length;
    const absent = attendance.filter(r => r.status === 'absent').length;
    const xp = number(dashboard?.xp?.total ?? dashboard?.student?.totalXp ?? selectedStudent?.totalXp);
    const level = number(dashboard?.xp?.currentLevel ?? dashboard?.student?.currentLevel ?? selectedStudent?.currentLevel) || 1;
    const achievements = dashboard?.achievements || [];
    const streak = dashboard?.streak || {};
    return { total, present, late, excused, absent, attendanceRate: pct(present + late, total), xp, level, achievements, streak };
  }, [attendance, dashboard, selectedStudent]);

  if (loading) return <div className="animate-pulse space-y-5"><div className="h-28 rounded-3xl bg-emerald-100"/><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(n=><div key={n} className="h-36 rounded-2xl bg-slate-100"/>)}</div></div>;
  if (!selectedStudent) return <div className="rounded-2xl bg-amber-50 p-6 text-amber-900">No hay estudiante seleccionado para mostrar el progreso.</div>;

  const firstName = selectedStudent.firstName || selectedStudent.first_name || 'estudiante';
  const maxStreak = Math.max(number(stats.streak.currentCount ?? stats.streak.current_count), number(stats.streak.bestCount ?? stats.streak.best_count));
  const cards = [
    { title: 'Asistencia efectiva', value: `${stats.attendanceRate}%`, detail: `${stats.present + stats.late} de ${stats.total} sesiones con asistencia`, icon: '📅', color: 'emerald' },
    { title: 'Experiencia acumulada', value: stats.xp.toLocaleString('es-NI') + ' XP', detail: `Nivel actual ${stats.level}`, icon: '⚡', color: 'amber' },
    { title: 'Racha registrada', value: maxStreak + ' sesiones', detail: 'Basado en la actividad guardada', icon: '🔥', color: 'orange' },
    { title: 'Logros obtenidos', value: stats.achievements.length, detail: 'Insignias guardadas en tu cuenta', icon: '🏆', color: 'violet' },
    { title: 'Llegadas tarde', value: stats.late, detail: 'Cuenta como asistencia, con seguimiento', icon: '⏰', color: 'sky' },
    { title: 'Ausencias', value: stats.absent, detail: 'Oportunidades para recibir acompañamiento', icon: '💚', color: 'rose' }
  ];
  const colors = { emerald: 'from-emerald-500 to-teal-500', amber: 'from-amber-400 to-orange-500', orange: 'from-orange-400 to-rose-500', violet: 'from-violet-500 to-fuchsia-500', sky: 'from-sky-400 to-cyan-500', rose: 'from-rose-400 to-pink-500' };

  return <div className="space-y-7">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 p-7 text-white shadow-lg md:p-9">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-100">Tu camino, tus logros</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Mi progreso, {firstName} ✨</h1><p className="mt-3 max-w-2xl text-emerald-50">Un resumen de la actividad registrada en INARA. Cada dato se actualiza desde tu cuenta.</p></div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur"><div className="text-4xl">🌱</div><p className="mt-1 text-sm font-semibold">Paso a paso</p></div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Sesiones', stats.total], ['Asistencias', stats.present + stats.late], ['XP acumulados', stats.xp.toLocaleString('es-NI')], ['Logros', stats.achievements.length]].map(([label, value])=><div key={label} className="rounded-xl bg-white/10 p-4"><p className="text-sm text-emerald-100">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
      </div>
    </header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No se pudo actualizar algún dato desde la API: {error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(card=><article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{card.title}</p><p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p></div><div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[card.color]} text-2xl shadow-sm`}>{card.icon}</div></div><p className="mt-3 text-sm text-slate-500">{card.detail}</p></article>)}
    </section>
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2"><h2 className="text-lg font-extrabold text-slate-900">Panorama de asistencia</h2><p className="mt-1 text-sm text-slate-500">Distribución de los registros de tu cuenta</p><div className="mt-5 space-y-4">{[['Presente',stats.present,'bg-emerald-500'],['Tarde',stats.late,'bg-amber-400'],['Ausente',stats.absent,'bg-rose-500'],['Justificado',stats.excused,'bg-sky-500']].map(([label,value,color])=><div key={label}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="text-slate-500">{value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:`${pct(value,stats.total)}%`}}/></div></div>)}</div>{stats.total===0&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Todavía no hay registros para calcular estadísticas.</p>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-900">Actividad reciente</h2><p className="mt-1 text-sm text-slate-500">Últimas sesiones registradas</p></div><a href="/attendance" className="text-sm font-bold text-emerald-700 hover:underline">Ver asistencia →</a></div><div className="mt-4 space-y-3">{attendance.slice(0,6).map((record,i)=><div key={record.id || i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="font-semibold text-slate-800">{record.course_name || record.course?.name || 'Sesión académica'}</p><p className="mt-1 text-xs text-slate-500">{record.session_date ? new Date(record.session_date).toLocaleDateString('es-NI',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}) : 'Fecha no disponible'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${record.status==='present'?'bg-emerald-100 text-emerald-800':record.status==='late'?'bg-amber-100 text-amber-800':record.status==='absent'?'bg-rose-100 text-rose-800':'bg-sky-100 text-sky-800'}`}>{({present:'Presente',late:'Tarde',absent:'Ausente',excused:'Justificado'})[record.status] || record.status}</span></div>)}{attendance.length===0&&<div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Tu historial aparecerá aquí cuando se registren sesiones en INARA.</div>}</div></div>
    </section>
    <p className="text-xs text-slate-400">Los indicadores reflejan datos guardados; INARA acompaña el progreso y no etiqueta al estudiante.</p>
  </div>;
}
