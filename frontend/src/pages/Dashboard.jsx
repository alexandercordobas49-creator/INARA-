import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard({ selectedStudent, session, courses = [] }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedStudent?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [res, attendanceData] = await Promise.all([
          api(`/dashboard/student/${selectedStudent.id}`),
          api(`/attendance?userId=${encodeURIComponent(selectedStudent.id)}`).catch(() => [])
        ]);

        if (!res) throw new Error('Respuesta vacía del servidor');

        const xpTotal = Number(res?.xp?.total ?? res?.student?.totalXp ?? 0);
        const nextLevelXp = Number(res?.xp?.nextLevel?.minXp ?? 500);
        setDashboard({
          ...res,
          attendanceHistory: Array.isArray(attendanceData) ? attendanceData : [],
          xp: { ...res.xp, progressToNextLevel: nextLevelXp > 0 ? Math.min(100, Math.round((xpTotal / nextLevelXp) * 100)) : 100 }
        });
      } catch (err) {
        console.error(err);
        setError(err.message || 'No se pudo cargar el panel.');
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStudent?.id]);

  if (!selectedStudent) {
    return (
      <div className="p-6">
        <p className="text-slate-600">⚠️ No hay estudiante seleccionado</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error && !dashboard) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><h2 className="font-bold">No pudimos cargar los datos de Valeria</h2><p className="mt-2 text-sm">{error}</p><p className="mt-2 text-sm">Verifica que la cuenta esté registrada y que el panel pueda consultar PostgreSQL.</p></div>;

  const xpTotal = dashboard?.xp?.total ?? 0;
  const currentLevel = dashboard?.xp?.currentLevel ?? 1;
  const progressPercentage = dashboard?.xp?.progressToNextLevel ?? 0;
  const totalAttendance = dashboard?.attendanceSummary?.total ?? 0;
  const presentAttendance = dashboard?.attendanceSummary?.present ?? 0;
  const attendanceRate = totalAttendance ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
  const monthlyGoal = 20;
  const goalProgress = Math.min(100, Math.round((presentAttendance / monthlyGoal) * 100));
  const streak = dashboard?.streak?.current_count ?? dashboard?.streak?.currentCount ?? 0;
  const bestStreak = dashboard?.streak?.best_count ?? dashboard?.streak?.bestCount ?? streak;
  const achievements = dashboard?.achievements || [];
  const xpEvents = dashboard?.xpEvents || [];
  const attendanceHistory = dashboard?.attendanceHistory || [];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-5xl font-extrabold text-neutral-900">
          ¡Bienvenida de nuevo, {selectedStudent.firstName || selectedStudent.first_name || 'Valeria'}! 👋
        </h1>
        <p className="text-neutral-500 text-lg">
          Cada paso que das hoy, te acerca al futuro que sueñas.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Piloto demostrativo · historial simulado desde el 20 de junio de 2026</div>
      </div>

      {/* Progreso General */}
      <div className="rounded-2xl bg-white p-10 border border-neutral-100 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.06)] relative overflow-hidden">
        <div className="relative z-10 grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-success-600 mb-3">
              Tu progreso general
            </p>
            <p className="text-7xl font-extrabold mb-4 text-neutral-900">{progressPercentage}%</p>
            <p className="text-sm text-neutral-500 font-semibold">¡Vas por un excelente camino!</p>
            <div className="mt-6 h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success-500 to-success-400 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-xs font-semibold text-neutral-500">Clases completadas</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{presentAttendance} / {totalAttendance}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">🔥</p>
              <p className="text-xs font-semibold text-neutral-500">Racha actual</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{streak} sesiones</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">🔥</p>
              <p className="text-xs font-semibold text-neutral-500">Racha más larga</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{bestStreak} sesiones</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">⚡</p>
              <p className="text-xs font-semibold text-neutral-500">XP · Nivel {currentLevel}</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{xpTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tus clases de hoy */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Tus clases de hoy</h2>
          <a href="#" className="text-emerald-600 font-semibold hover:underline">Ver todas</a>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {courses.slice(0, 3).map((course, idx) => ({ ...course, topic: course.status === 'active' ? 'Curso activo · seguimiento académico' : 'Curso', progress: Math.min(100, Math.round((presentAttendance / Math.max(totalAttendance, 1)) * 100)), icon: ['📘', '💻', '🧠'][idx], color: ['from-emerald-500 to-teal-600', 'from-sky-500 to-cyan-600', 'from-amber-500 to-orange-500'][idx] })).map((course, idx) => (
            <div key={idx} className="rounded-2xl bg-white p-8 shadow-sm hover:shadow-md transition-all border border-neutral-100">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${course.color} text-white flex items-center justify-center text-2xl mb-4 font-bold`}>
                {course.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{course.name}</h3>
              <p className="text-sm text-slate-600 mb-4">{course.topic}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Progreso</span>
                  <span className="text-xs font-bold text-slate-700">{course.progress}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success-500 to-success-400 transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de asistencia del piloto */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Desde el 20 de junio de 2026</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Historial reciente de asistencia</h2>
            <p className="mt-1 text-sm text-slate-500">Registros del escenario piloto guardados en PostgreSQL.</p>
          </div>
          <a href="/attendance" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Ver historial completo →</a>
        </div>
        <div className="space-y-3">
          {attendanceHistory.slice(0, 6).length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aún no hay asistencias registradas.</p> : attendanceHistory.slice(0, 6).map((record) => (
            <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div>
                <p className="font-semibold text-slate-900">{record.course_name}</p>
                <p className="mt-1 text-xs text-slate-500">{record.session_date ? new Date(record.session_date).toLocaleDateString('es-NI', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Fecha no disponible'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.status === 'present' ? 'bg-emerald-100 text-emerald-800' : record.status === 'late' ? 'bg-amber-100 text-amber-800' : record.status === 'absent' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}`}>
                {record.status === 'present' ? 'Presente' : record.status === 'late' ? 'Tarde' : record.status === 'absent' ? 'Ausente' : 'Justificado'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Meta y Actividad */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Meta del mes */}
        <div className="lg:col-span-1 rounded-2xl bg-white p-8 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              🎯 Meta del mes
            </h3>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-2">Meta: 20 asistencias</p>
              <p className="text-sm text-neutral-500 mb-3">Vas por {presentAttendance}/{monthlyGoal} asistencias registradas</p>
              <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success-500 to-success-400"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-4xl font-extrabold text-success-600">{goalProgress}%</p>
              <p className="text-xs text-neutral-500 mt-2">Completado</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl">🎁</p>
              <p className="text-xs font-semibold text-neutral-700 mt-2">Recompensa disponible</p>
            </div>
          </div>
        </div>

        {/* Actividad y Logros */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asistente IA */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 p-6 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white p-2">
                <img src="/assets/atlas/robot-smile.svg" alt="Atlas" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-2">Asistente IA</h4>
                <p className="text-sm text-slate-600 mb-4">¡Hola {selectedStudent.firstName || selectedStudent.first_name || 'Valeria'}! 👋</p>
                <p className="text-sm text-slate-600 mb-4">¿En qué puedo ayudarte hoy?</p>
                <div className="flex gap-2">
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
                    Explicame un tema
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
                    Dame consejos
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
                    Motivame
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actividad reciente */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">📈 Actividad reciente</h4>
              <a href="#" className="text-xs text-emerald-600 font-semibold hover:underline">Ver toda la actividad</a>
            </div>
            <div className="space-y-3">
              {xpEvents.slice(0, 3).map((event, idx) => ({ activity: event.description || 'Actividad registrada', points: event.points || 0, time: event.created_at ? new Date(event.created_at).toLocaleDateString('es-NI', { day: '2-digit', month: 'short' }) : 'Historial piloto' })).map((event, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-all">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.activity}</p>
                    <p className="text-xs text-slate-500 mt-1">{event.time}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">+{event.points} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logros recientes */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">🏆 Logros recientes</h2>
          <a href="#" className="text-emerald-600 font-semibold hover:underline">Ver todos</a>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {achievements.slice(0, 3).map((item, idx) => ({ name: item.achievement?.name || item.name || 'Logro', description: item.achievement?.description || item.description || 'Progreso académico registrado', icon: ['🟢', '📘', '🎯'][idx] })).map((achievement, idx) => (
            <div key={idx} className="rounded-2xl bg-white p-6 shadow-lg border border-slate-200 text-center hover:shadow-xl transition-all">
              <p className="text-5xl mb-3">{achievement.icon}</p>
              <h4 className="font-bold text-slate-900 mb-1">{achievement.name}</h4>
              <p className="text-xs text-slate-600">{achievement.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 p-8 border border-emerald-200 flex gap-6">
        <div className="text-5xl flex-shrink-0">💬</div>
        <div>
          <p className="text-lg font-semibold text-slate-900 italic mb-2">
            "Si la patria es pequeña, uno grande la sueña."
          </p>
          <p className="text-sm text-slate-600 mb-3">— Rubén Darío</p>
          <p className="text-sm text-slate-600 italic">Porque cada estudiante que aprende hoy, construye la Nicaragua que soñamos mañana.</p>
        </div>
      </div>
    </div>
  );
}
