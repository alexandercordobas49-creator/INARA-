import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StudentSelector from '../components/StudentSelector.jsx';

export default function Rewards({ session, users }) {
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
    api(`/achievements/${encodeURIComponent(studentId)}`)
      .then((data) => {
        if (active) {
          setSummary(data);
          setError('');
        }
      })
      .catch((loadError) => {
        if (active) {
          console.error('Unable to load earned rewards:', loadError);
          setSummary(null);
          setError(loadError.message || 'No se pudieron cargar los logros.');
        }
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</p>;
  if (!students.length) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No hay estudiantes disponibles en tu ámbito autorizado.</p>;
  if (!studentId) return <div className="space-y-3"><StudentSelector students={students} value={studentId} onChange={setStudentId} /><p className="text-slate-600">Selecciona un estudiante para consultar sus logros.</p></div>;
  if (!summary) return <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando recompensas registradas…</p>;

  const earnedIds = new Set(summary.earnedAchievements.map((item) => item.achievementId));
  const totalXp = summary.student.totalXp;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Logros y recompensas</h1>
        <p className="mt-2 text-slate-600">
          Los logros mostrados provienen de PostgreSQL. El canje de recompensas y el ranking no están habilitados.
        </p>
        {!isStudent && <div className="mt-4 max-w-sm"><StudentSelector students={students} value={studentId} onChange={setStudentId} /></div>}
      </header>
      <p className="rounded-xl border border-slate-200 bg-white p-5 font-semibold text-slate-800">
        {totalXp === null ? 'XP individual no disponible para el rol docente' : `${Number(totalXp).toLocaleString()} XP acumulados`}
      </p>
      {summary.achievements.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {summary.achievements.map((achievement) => {
            const earned = earnedIds.has(achievement.id);
            return (
              <li key={achievement.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900">{achievement.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{achievement.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${earned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    {earned ? 'Obtenido' : 'Disponible'}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-500">Recompensa registrada: {achievement.xpReward} XP</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No hay logros configurados.</p>
      )}
    </div>
  );
}
