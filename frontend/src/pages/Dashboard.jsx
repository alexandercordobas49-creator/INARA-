import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StudentSelector from '../components/StudentSelector.jsx';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function Dashboard({ session, users, courses }) {
  const isStudent = session?.user?.role === 'student';
  const [studentId, setStudentId] = useState(isStudent ? session.user.id : '');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const students = isStudent ? [session.user] : users.filter((user) => user.role === 'student');
  const activeStudent = students.find((student) => student.id === studentId);

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
    if (!activeStudent?.id) {
      setDashboard(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    setDashboard(null);
    api(`/dashboard/student/${encodeURIComponent(activeStudent.id)}`)
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((loadError) => {
        if (active) {
          console.error('Unable to load dashboard:', loadError);
          setDashboard(null);
          setError(loadError.message || 'No se pudo cargar el panel.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeStudent?.id]);

  if (!students.length) {
    return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No hay estudiantes disponibles en tu ámbito autorizado.</p>;
  }

  if (!studentId) {
    return <div className="space-y-4"><StudentSelector students={students} value={studentId} onChange={setStudentId} /><p className="text-slate-600">Selecciona un estudiante para consultar sus datos autorizados.</p></div>;
  }

  if (loading) {
    return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando datos del estudiante…</p>;
  }

  if (error) {
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</p>;
  }

  if (!dashboard) return null;

  const xp = dashboard.xp || {};
  const attendance = dashboard.attendanceSummary || {};
  const currentXp = typeof xp.total === 'number' ? xp.total : null;
  const currentLevelMinXp = Number(xp.currentLevelMinXp) || 0;
  const nextLevelMinXp = xp.nextLevel?.minXp;
  const levelProgress = currentXp !== null && Number.isFinite(nextLevelMinXp) && nextLevelMinXp > currentLevelMinXp
    ? Math.min(100, Math.max(0, ((currentXp - currentLevelMinXp) / (nextLevelMinXp - currentLevelMinXp)) * 100))
    : null;
  const attendanceRate = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : 0;
  const achievements = dashboard.achievements || [];
  const xpEvents = dashboard.xpEvents || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Panel académico</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Hola, {activeStudent?.firstName || activeStudent?.first_name}
          </h1>
        </div>
        {!isStudent && <StudentSelector students={students} value={studentId} onChange={setStudentId} />}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Experiencia</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{currentXp === null ? '—' : `${currentXp.toLocaleString()} XP`}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Nivel actual</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{xp.currentLevel ?? '—'}</p>
          {xp.nextLevel && <p className="mt-1 text-sm text-slate-500">Siguiente: {xp.nextLevel.name}</p>}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Asistencia registrada</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{attendanceRate}%</p>
          <p className="mt-1 text-sm text-slate-500">{attendance.present || 0} de {attendance.total || 0} sesiones presentes</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Racha actual registrada</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{dashboard.streak?.currentCount ?? 0} días</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Progreso al siguiente nivel</h2>
          {levelProgress === null ? (
            <p className="mt-4 text-sm text-slate-600">
              {session?.user?.role === 'instructor' ? 'La XP y el nivel global individual no se exponen al rol docente.' : 'No hay otro nivel configurado.'}
            </p>
          ) : (
            <>
              <p className="mt-4 text-3xl font-extrabold text-emerald-700">{Math.round(levelProgress)}%</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${levelProgress}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-500">{Math.max(0, nextLevelMinXp - currentXp)} XP para el siguiente nivel</p>
            </>
          )}
          <p className="mt-4 text-sm text-slate-600">
            {attendance.total ? `${attendance.absent || 0} ausencias y ${attendance.late || 0} tardanzas registradas.` : 'Aún no hay asistencias registradas en este ámbito.'}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Cursos disponibles</h2>
          {courses.length ? (
            <ul className="mt-4 space-y-3">
              {courses.map((course) => (
                <li key={course.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">{course.name}</p>
                  <p className="text-sm text-slate-500">{course.status || 'Estado no especificado'}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate-500">No hay cursos disponibles en tu ámbito.</p>}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Actividad reciente</h2>
          {xpEvents.length ? (
            <ul className="mt-4 space-y-3">
              {xpEvents.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{event.description || 'Actividad registrada'}</p>
                    <p className="text-sm text-slate-500">{formatDate(event.createdAt)}</p>
                  </div>
                  <span className="whitespace-nowrap font-bold text-emerald-700">{event.points > 0 ? '+' : ''}{event.points} XP</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate-500">{session?.user?.role === 'instructor' ? 'El detalle global de XP no está disponible para el rol docente.' : 'No hay actividad registrada todavía.'}</p>}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Logros obtenidos</h2>
          {achievements.length ? (
            <ul className="mt-4 space-y-3">
              {achievements.map((entry) => (
                <li key={entry.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">{entry.achievement.name}</p>
                  <p className="text-sm text-slate-600">{entry.achievement.description}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate-500">{session?.user?.role === 'instructor' ? 'El historial global de logros no está disponible para el rol docente.' : 'Aún no se han obtenido logros.'}</p>}
        </article>
      </section>
    </div>
  );
}
