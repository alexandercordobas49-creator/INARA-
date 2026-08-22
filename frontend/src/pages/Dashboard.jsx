import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { api } from '../api.js';

export default function Dashboard({ selectedStudent, session }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const mockData = {
    xp: { total: 2450, currentLevel: 8, progressToNextLevel: 72 },
    attendanceSummary: { total: 25, present: 18 },
    streak: { currentCount: 12 },
    achievements: [
      { id: 1, achievement: { name: 'Constante', description: 'Estudia 7 días seguidos' } },
      { id: 2, achievement: { name: 'Dedicado', description: 'Completa 10 clases' } },
      { id: 3, achievement: { name: 'Enfocado', description: 'Alcanza una meta mensual' } }
    ],
    xpEvents: [
      { id: 1, description: 'Completaste Matemáticas: Funciones', points: 120 },
      { id: 2, description: 'Obtuviste el logro «Constante»', points: 200 },
      { id: 3, description: 'Iniciaste sesión 7 días seguidos', points: 100 }
    ]
  };

  useEffect(() => {
    if (!selectedStudent?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api(`/dashboard/student/${selectedStudent.id}`);

        if (!res) throw new Error('Respuesta vacía del servidor');

        setDashboard(res);
      } catch (err) {
        console.error(err);
        // Usar datos simulados si hay error
        setDashboard(mockData);
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

  const xpTotal = dashboard?.xp?.total || 2450;
  const currentLevel = dashboard?.xp?.currentLevel || 8;
  const progressPercentage = dashboard?.xp?.progressToNextLevel || 72;
  const attendanceRate = dashboard?.attendanceSummary?.total
    ? Math.round(
        (dashboard.attendanceSummary.present / dashboard.attendanceSummary.total) * 100
      )
    : 0;
  const streak = dashboard?.streak?.currentCount || 12;
  const achievements = dashboard?.achievements || [];
  const xpEvents = dashboard?.xpEvents || [];

  // Handlers
  const handleViewProgress = () => {
    setModal({
      type: 'info',
      title: 'Detalles del Progreso',
      message: `📊 Nivel Actual: ${currentLevel}\n\n⭐ XP Total: ${xpTotal.toLocaleString()}\n\n📈 Progreso al siguiente nivel: ${progressPercentage}%\n\nSigue ganando XP para alcanzar el nivel 9. ¡Te falta poco!`,
      actions: [
        {
          label: 'Continuar aprendiendo',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  const handleViewAchievements = () => {
    setModal({
      type: 'info',
      title: `${achievements.length} Logros Desbloqueados`,
      message: achievements.length > 0
        ? achievements.map((a) => `🏆 ${a.achievement.name} - ${a.achievement.description}`).join('\n')
        : 'Aún no has desbloqueado logros. ¡Sigue participando para lograrlo!',
      actions: [
        {
          label: 'Ver todos los logros',
          primary: true,
          handler: () => window.location.href = '/achievements'
        }
      ],
      isOpen: true
    });
  };

  const handleViewAttendance = () => {
    setModal({
      type: 'info',
      title: 'Resumen de Asistencia',
      message: `✅ Total de asistencias: ${dashboard?.attendanceSummary?.total || 0}\n\n👤 Presente: ${dashboard?.attendanceSummary?.present || 0}\n\n📊 Tasa de asistencia: ${attendanceRate}%\n\n¡Mantén tu asistencia alta para acceder a bonificaciones especiales!`,
      actions: [
        {
          label: 'Ir a Asistencia',
          primary: true,
          handler: () => window.location.href = '/attendance'
        }
      ],
      isOpen: true
    });
  };

  const handleViewRacha = () => {
    setModal({
      type: 'success',
      title: `¡Racha de ${streak} días!`,
      message: `🔥 Vas en una racha de ${streak} días consecutivos.\n\nCada día que no rompas tu racha:\n✓ Ganas XP bonus\n✓ Tu multiplicador sube\n✓ Desbloqueas recompensas\n\n¡Sigue así, no pierdas la racha hoy!`,
      actions: [
        {
          label: 'Ir a aprender',
          primary: true,
          handler: () => {}
        }
      ],
      isOpen: true
    });
  };

  return (
    <>
      <Modal
        isOpen={modal?.isOpen || false}
        title={modal?.title || ''}
        message={modal?.message || ''}
        type={modal?.type || 'info'}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      />
    <div className="space-y-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-3">
          ¡Bienvenida de nuevo, {selectedStudent.firstName}!
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          Cada paso que das hoy, te acerca al futuro que sueñas.
        </p>
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
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-xs font-semibold text-neutral-500">Clases completadas</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">18 / 25</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">🔥</p>
              <p className="text-xs font-semibold text-neutral-500">Racha más larga</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{streak} días</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-xs font-semibold text-neutral-500">Logros obtenidos</p>
              <p className="text-2xl font-extrabold mt-2 text-neutral-900">{achievements.length}</p>
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
          {[
            { name: 'Matemáticas', topic: 'Funciones cuadráticas', progress: 80, icon: '∫', color: 'from-blue-500 to-purple-600' },
            { name: 'Química', topic: 'Enlaces químicos', progress: 60, icon: '⚗️', color: 'from-yellow-500 to-orange-600' },
            { name: 'Historia', topic: 'Revolución Industrial', progress: 40, icon: '📖', color: 'from-emerald-500 to-teal-600' }
          ].map((course, idx) => (
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
              <p className="text-sm font-semibold text-neutral-700 mb-2">Completar 20 clases</p>
              <p className="text-sm text-neutral-500 mb-3">Vas por 18/20 clases completadas</p>
              <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success-500 to-success-400"
                  style={{ width: '90%' }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 text-center border border-neutral-100 shadow-sm">
              <p className="text-4xl font-extrabold text-success-600">90%</p>
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
                <p className="text-sm text-slate-600 mb-4">¡Hola Valeria! 👋</p>
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
              <button onClick={handleViewProgress} className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer">Ver toda la actividad</button>
            </div>
            <div className="space-y-3">
              {[
                { activity: 'Completaste Matemáticas: Funciones', points: 120, time: 'Hace 2 horas' },
                { activity: 'Obtuviste el logro «Constante»', points: 200, time: 'Ayer' },
                { activity: 'Iniciaste sesión 7 días seguidos', points: 100, time: 'Ayer' }
              ].map((event, idx) => (
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
          <button onClick={handleViewAchievements} className="text-emerald-600 font-semibold hover:underline cursor-pointer">Ver todos</button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Constante', description: 'Estudia 7 días seguidos', icon: '🟢' },
            { name: 'Dedicado', description: 'Completa 10 clases', icon: '📘' },
            { name: 'Enfocado', description: 'Alcanza una meta mensual', icon: '🎯' }
          ].map((achievement, idx) => (
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
    </>
  );
}
