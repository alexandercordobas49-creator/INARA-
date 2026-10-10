import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StudentSelector from '../components/StudentSelector.jsx';

export default function Progress({ session, users }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const isStudent = session?.user?.role === 'student';
  const students = isStudent ? [session.user] : users.filter((user) => user.role === 'student');
  const [studentId, setStudentId] = useState(isStudent ? session.user.id : '');

  useEffect(() => {
    if (isStudent) {
      setStudentId(session.user.id);
    } else if (studentId && !students.some((student) => student.id === studentId)) {
      setStudentId('');
    } else if (!studentId && students.length === 1) {
      setStudentId(students[0].id);
    }
  }, [isStudent, session?.user?.id, students, studentId]);

  useEffect(() => {
    if (!studentId) {
      setSummary(null);
      return undefined;
    }
    let active = true;
    setSummary(null);
    setError('');
    api(`/dashboard/student/${encodeURIComponent(studentId)}`)
      .then((data) => {
        if (active) {
          setSummary(data);
          setError('');
        }
      })
      .catch((loadError) => {
        if (active) {
          console.error('Unable to load progress:', loadError);
          setSummary(null);
          setError(loadError.message || 'No se pudo cargar el progreso.');
        }
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</p>;
  if (!students.length) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No hay estudiantes disponibles en tu ámbito autorizado.</p>;
  if (!studentId) return <div className="space-y-3"><StudentSelector students={students} value={studentId} onChange={setStudentId} /><p className="text-slate-600">Selecciona un estudiante para consultar el progreso.</p></div>;
  if (!summary) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando progreso registrado…</p>;

  const attendance = summary.attendanceSummary || {};
  const xp = summary.xp || {};
  const totalXp = Number(xp.total) || 0;
  const levelMinXp = Number(xp.currentLevelMinXp) || 0;
  const nextMinXp = xp.nextLevel?.minXp;
  const levelProgress = Number.isFinite(nextMinXp) && nextMinXp > levelMinXp
    ? Math.min(100, Math.max(0, ((totalXp - levelMinXp) / (nextMinXp - levelMinXp)) * 100))
    : null;
  const metrics = [
    ['Asistencias presentes', `${attendance.present || 0}/${attendance.total || 0}`],
    ['Racha actual registrada', `${summary.streak?.currentCount ?? 0} días`],
    ['Logros obtenidos', summary.achievements?.length || 0],
    ['XP acumulado', totalXp.toLocaleString()]
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Progreso registrado</h1>
        <p className="mt-2 text-slate-600">Resumen calculado con datos guardados en la plataforma.</p>
        {!isStudent && <div className="mt-4 max-w-sm"><StudentSelector students={students} value={studentId} onChange={setStudentId} /></div>}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Nivel {xp.currentLevel ?? '—'}</h2>
        {levelProgress === null ? (
          <p className="mt-3 text-sm text-slate-600">No hay un siguiente nivel configurado.</p>
        ) : (
          <>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {Math.round(levelProgress)}% hacia {xp.nextLevel.name}; faltan {Math.max(0, nextMinXp - totalXp)} XP.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
