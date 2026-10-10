import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ModuleHeader from '../components/ModuleHeader.jsx';
import Panel from '../components/Panel.jsx';
import StudentSelector from '../components/StudentSelector.jsx';

export default function Achievements({ session, users }) {
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
          console.error('Unable to load achievements:', loadError);
          setSummary(null);
          setError(loadError.message || 'No se pudieron cargar los logros.');
        }
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</p>;
  if (!students.length) return <ModuleHeader eyebrow="Modulo 6" title="Logros y rachas" description="No hay estudiantes disponibles en tu ámbito autorizado." />;
  if (!studentId) return <StudentSelector students={students} value={studentId} onChange={setStudentId} />;
  if (!summary) return <p className="text-neutral-600">Cargando logros…</p>;

  const earnedIds = new Set(summary.earnedAchievements.map((item) => item.achievementId));
  const streak = summary.streaks[0];

  return (
    <>
      <ModuleHeader eyebrow="Modulo 6" title="Logros y rachas" description="Reconocimientos y continuidad calculados automaticamente." />
      {!isStudent && <div className="mb-5 max-w-sm"><StudentSelector students={students} value={studentId} onChange={setStudentId} /></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel title="Logros">
          <div className="grid gap-3">
            {summary.achievements.map((achievement) => (
              <div className="rounded-xl border border-neutral-200 p-5 hover:shadow-lg hover:border-primary-300 transition-all duration-300" key={achievement.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-neutral-900 text-lg">{achievement.name}</p>
                    <p className="text-sm text-neutral-600 font-medium mt-1">{achievement.description}</p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${earnedIds.has(achievement.id) ? 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg' : 'bg-neutral-200 text-neutral-700'}`}>
                    {earnedIds.has(achievement.id) ? '✅ Obtenido' : `${achievement.xpReward} XP`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="🔥 Racha">
          <p className="text-5xl font-bold bg-gradient-to-r from-warning-500 to-orange-500 bg-clip-text text-transparent">{streak?.currentCount || 0} 🔥</p>
          <p className="mt-4 text-lg font-semibold text-neutral-700">Mejor racha: {streak?.bestCount || 0} días</p>
          <p className="mt-6 text-sm leading-6 text-neutral-600 bg-neutral-100 p-3 rounded-lg font-medium">⏰ Última actividad: {streak?.lastActivityDate || 'Sin actividad'}</p>
        </Panel>
      </div>
    </>
  );
}
