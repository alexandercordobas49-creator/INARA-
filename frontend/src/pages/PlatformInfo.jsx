import React, { useEffect, useMemo, useState } from 'react';
import './PlatformInfo.css';

function AnimatedCounter({ value, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 16;
    const increment = Math.max(Math.floor(value / (duration / stepTime)), 1);
    const timer = window.setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        window.clearInterval(timer);
      }
      setCount(start);
    }, stepTime);
    return () => window.clearInterval(timer);
  }, [value]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

const indicatorMetrics = [
  { icon: '👨‍🎓', label: 'Estudiantes registrados', value: 1250 },
  { icon: '🏫', label: 'Centros educativos', value: 24 },
  { icon: '📚', label: 'Cursos disponibles', value: 85 },
  { icon: '🤖', label: 'Consultas a Atlas IA', value: 18420 },
  { icon: '🏆', label: 'Logros desbloqueados', value: 7812 },
  { icon: '⭐', label: 'XP generada', value: 1245000 },
  { icon: '🔥', label: 'Rachas activas', value: 652 },
  { icon: '📈', label: 'Promedio asistencia', value: 93, suffix: '%' },
];

const departments = [
  { id: 'granada', name: 'Granada', students: 150, centers: 8, attendance: '95%', cx: 72, cy: 176 },
  { id: 'managua', name: 'Managua', students: 430, centers: 18, attendance: '92%', cx: 170, cy: 110 },
  { id: 'masaya', name: 'Masaya', students: 120, centers: 5, attendance: '89%', cx: 128, cy: 190 },
  { id: 'leon', name: 'León', students: 170, centers: 7, attendance: '91%', cx: 100, cy: 66 },
];

const modules = [
  { icon: '📚', label: 'Mis Cursos', description: 'Gestiona tus clases.' },
  { icon: '📈', label: 'Mi Progreso', description: 'Visualiza estadísticas.' },
  { icon: '📝', label: 'Asistencia', description: 'Consulta tu historial.' },
  { icon: '�', label: 'Asistencia Escolar', description: 'Registra y revisa asistencia por jornada.' },
  { icon: '�🏆', label: 'Logros', description: 'Desbloquea recompensas.' },
  { icon: '🎯', label: 'Retos', description: 'Completa desafíos.' },
  { icon: '🤖', label: 'Atlas IA', description: 'Recibe ayuda personalizada.' },
];

const benefits = [
  { icon: '🤖', title: 'Inteligencia Artificial', description: 'Recomendaciones adaptativas basadas en tu desempeño.' },
  { icon: '📊', title: 'Analítica en tiempo real', description: 'Información instantánea del avance y desempeño.' },
  { icon: '🎮', title: 'Gamificación', description: 'Motivación constante con logros y retos.' },
  { icon: '🏫', title: 'Gestión académica', description: 'Organiza clases, asistencia y objetivos en un solo lugar.' },
  { icon: '📚', title: 'Aprendizaje personalizado', description: 'Rutas de estudio ajustadas a tus necesidades.' },
  { icon: '🔒', title: 'Seguridad', description: 'Datos protegidos con estándares modernos.' },
];

const technologies = ['React', 'Node.js', 'Express', 'PostgreSQL', 'TailwindCSS', 'JWT', 'Atlas IA'];

const odsItems = [
  { label: 'ODS 4', title: 'Educación de Calidad' },
  { label: 'ODS 9', title: 'Industria e Innovación' },
  { label: 'ODS 10', title: 'Reducción de desigualdades' },
  { label: 'ODS 17', title: 'Alianzas para lograr los objetivos' },
];

const newsItems = [
  { title: 'Hackathon Nicaragua', description: 'INARA participa en el evento con nuevas demostraciones de Atlas IA.' },
  { title: 'Nuevos cursos', description: 'Se agregaron 12 cursos enfocados en habilidades digitales y STEM.' },
  { title: 'Actualización Atlas IA', description: 'Atlas ahora entrega recomendaciones más contextualizadas para cada estudiante.' },
  { title: 'Próximos eventos', description: 'Sesiones de formación docente y talleres de aprendizaje adaptativo.' },
];

const flowSteps = [
  { id: 'registro', icon: '✍️', label: 'Registro', detail: 'El estudiante crea su cuenta, configura su perfil y se integra a la plataforma académica.' },
  { id: 'cursos', icon: '📚', label: 'Cursos', detail: 'Accede al catálogo, inscribe materias y organiza tu carga académica con claridad.' },
  { id: 'asistencia', icon: '🗓️', label: 'Asistencia', detail: 'Registra y consulta el seguimiento diario de clases para mantener el ritmo académico.' },
  { id: 'gamificacion', icon: '🎮', label: 'Gamificación', detail: 'Gana puntos, medallas y desafíos que hacen el aprendizaje más motivador y competitivo.' },
  { id: 'atlas', icon: '🤖', label: 'Atlas IA', detail: 'Recibe recomendaciones inteligentes, análisis de desempeño y apoyo personalizado en cada paso.' },
  { id: 'analisis', icon: '📈', label: 'Análisis', detail: 'Visualiza patrones, tendencias y resultados para tomar decisiones informadas sobre tu aprendizaje.' },
  { id: 'logros', icon: '🏆', label: 'Logros', detail: 'Desbloquea recompensas por tus avances y celebra cada meta alcanzada con seguimiento constante.' },
  { id: 'graduacion', icon: '🎓', label: 'Graduación', detail: 'Alcanza el cierre exitoso de tu ciclo académico con resultados que hablan por ti.' },
];

export default function PlatformInfo() {
  const [activeDept, setActiveDept] = useState('managua');
  const [selectedFlow, setSelectedFlow] = useState(flowSteps[0].id);

  const activeDepartment = useMemo(
    () => departments.find((dept) => dept.id === activeDept) || departments[1],
    [activeDept]
  );

  const selectedFlowStep = useMemo(
    () => flowSteps.find((step) => step.id === selectedFlow) || flowSteps[0],
    [selectedFlow]
  );

  return (
    <div className="platform-page px-6 py-8 md:px-10 lg:px-12">
      <section className="platform-hero grid gap-10 lg:grid-cols-[1.2fr_0.95fr] p-10 lg:p-12">
        <div className="space-y-8 max-w-3xl">
          <div className="inline-flex items-center gap-3 platform-pill">Nuevo en la plataforma</div>
          <div className="space-y-5">
            <h1 className="text-5xl font-black leading-tight text-slate-950 md:text-6xl">Bienvenido a INARA</h1>
            <p className="text-lg leading-8 text-slate-600 max-w-2xl">
              La plataforma educativa inteligente que impulsa el aprendizaje mediante Inteligencia Artificial, gamificación y análisis académico en tiempo real.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button className="platform-hero-cta inline-flex items-center justify-center rounded-[28px] bg-emerald-600 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(34,197,94,0.8)] transition hover:bg-emerald-500">
              Comenzar recorrido
            </button>
            <button className="platform-hero-cta inline-flex items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50">
              Explorar plataforma
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-7 shadow-sm">
            <p className="text-slate-600 text-lg leading-7 font-medium">
              "Cada estudiante tiene un potencial único. INARA utiliza tecnología para ayudarle a descubrirlo."
            </p>
          </div>
        </div>

        <div className="platform-hero-illu">
          <div className="platform-hero-robot">
            <div className="platform-hero-robot-inner">
              <div className="platform-hero-robot-icon">🤖</div>
            </div>
            <div className="platform-hero-robot-card">
              <p className="text-xl font-bold text-slate-900">Atlas IA te saluda</p>
              <p className="mt-3 text-slate-600 leading-7">
                Descubre recomendaciones personalizadas, rutas de aprendizaje y un análisis académico continuo en un solo lugar.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-emerald-50 px-4 py-4 border border-emerald-100">
                  <p className="text-sm font-semibold text-emerald-700">Racha activa</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">12 días</p>
                </div>
                <div className="rounded-3xl bg-slate-900 px-4 py-4 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Impacto</p>
                  <p className="mt-2 text-2xl font-bold">652 estudiantes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Indicadores generales</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Visión rápida de la plataforma</h2>
          </div>
          <p className="max-w-xl text-slate-600">Datos simulados para este demo, listos para conectarse a la API de métricas reales cuando el backend esté disponible.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {indicatorMetrics.slice(0, 4).map((metric) => (
            <div key={metric.label} className="platform-metric-card p-6">
              <div className="text-3xl">{metric.icon}</div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-4xl font-black text-slate-950">
                <AnimatedCounter value={metric.value} suffix={metric.suffix || ''} />
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {indicatorMetrics.slice(4).map((metric) => (
            <div key={metric.label} className="platform-metric-card p-6">
              <div className="text-3xl">{metric.icon}</div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-4xl font-black text-slate-950">
                <AnimatedCounter value={metric.value} suffix={metric.suffix || ''} />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="platform-map-card p-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Impacto Nacional</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">Mapa de Nicaragua</h2>
              </div>
              <div className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Departamentos interactivos</div>
            </div>
            <p className="max-w-2xl text-slate-600">Selecciona un departamento para explorar el alcance local de INARA en tiempos de demostración.</p>
          </div>

          <div className="mt-8">
            <svg viewBox="0 0 360 260" className="platform-map-view" preserveAspectRatio="xMidYMid meet">
              {departments.map((dept) => (
                <g key={dept.id} onMouseEnter={() => setActiveDept(dept.id)} className={`platform-map-dot ${activeDept === dept.id ? 'active' : ''}`}>
                  <circle cx={dept.cx} cy={dept.cy} r="18" fill={activeDept === dept.id ? '#22c55e' : '#ffffff'} stroke="#16a34a" strokeWidth="3" opacity={activeDept === dept.id ? '1' : '0.92'} />
                  <text x={dept.cx} y={dept.cy + 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={activeDept === dept.id ? '#ffffff' : '#0f172a'}>{dept.name.charAt(0)}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-6">
          <div className="platform-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Detalle por departamento</p>
            <h3 className="mt-4 text-2xl font-black text-slate-950">{activeDepartment.name}</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Estudiantes</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{activeDepartment.students}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Centros</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{activeDepartment.centers}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5 sm:col-span-2">
                <p className="text-sm text-slate-500">Asistencia</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{activeDepartment.attendance}</p>
              </div>
            </div>
          </div>

          <div className="platform-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">¿Qué es INARA?</p>
            <h3 className="mt-4 text-2xl font-black text-slate-950">INARA es un ecosistema educativo inteligente</h3>
            <p className="mt-5 text-slate-600 leading-8">
              INARA es un ecosistema educativo inteligente desarrollado para fortalecer el aprendizaje mediante inteligencia artificial, seguimiento académico, análisis predictivo y gamificación.
            </p>
            <p className="mt-4 text-slate-600 leading-8">
              Su propósito es reducir la deserción estudiantil, mejorar el rendimiento académico y ofrecer herramientas innovadoras tanto para estudiantes como para docentes.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Cómo funciona</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Flujo de aprendizaje integrado</h2>
          </div>
          <p className="max-w-xl text-slate-600">Una experiencia fluida que acompaña al estudiante desde el registro hasta la graduación.</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            {flowSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelectedFlow(step.id)}
                className={`platform-flow-step ${selectedFlow === step.id ? 'active' : ''}`}
              >
                <span className="platform-flow-step-icon">{step.icon}</span>
                <span className="font-semibold text-slate-900">{step.label}</span>
                {index < flowSteps.length - 1 && <span className="ml-auto text-slate-400">→</span>}
              </button>
            ))}
          </div>

          <div className="platform-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Concepto seleccionado</p>
            <h3 className="mt-4 text-2xl font-black text-slate-950">{selectedFlowStep.label}</h3>
            <p className="mt-5 text-slate-600 leading-8">{selectedFlowStep.detail}</p>
            <div className="mt-6 rounded-3xl bg-slate-50 p-5 border border-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Por qué importa</p>
              <p className="mt-3 text-slate-600 leading-7">
                Esta etapa hace que el trayecto sea claro, accesible y que el estudiante sepa qué viene después en su experiencia con INARA.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Módulos principales</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Herramientas centrales de INARA</h2>
          </div>
          <p className="max-w-xl text-slate-600">Cada módulo entrega información clara y accionable para estudiantes y docentes.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <div key={module.label} className="platform-module-card p-6">
              <div className="text-4xl">{module.icon}</div>
              <p className="mt-4 text-xl font-bold text-slate-950">{module.label}</p>
              <p className="mt-3 text-slate-600">{module.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_0.8fr]">
        <div className="platform-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Atlas IA</p>
          <h2 className="mt-4 text-3xl font-black text-slate-950">Conoce a Atlas IA</h2>
          <p className="mt-5 text-slate-600 leading-8">
            Atlas IA analiza tu rendimiento académico, identifica oportunidades de mejora, genera recomendaciones inteligentes y te acompaña durante todo tu proceso de aprendizaje.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button className="platform-hero-cta bg-emerald-600 text-white hover:bg-emerald-500">Hablar con Atlas</button>
            <button className="platform-hero-cta border border-slate-200 bg-white text-slate-950 hover:border-emerald-200 hover:bg-emerald-50">Ver recomendaciones</button>
            <button className="platform-hero-cta border border-slate-200 bg-white text-slate-950 hover:border-emerald-200 hover:bg-emerald-50">Conocer funciones</button>
          </div>
        </div>
        <div className="platform-hero-illu p-8">
          <div className="platform-hero-robot">
            <div className="platform-hero-robot-inner">
              <div className="platform-hero-robot-icon">🤖</div>
            </div>
            <div className="platform-hero-robot-card">
              <p className="text-lg font-bold text-slate-950">Atlas IA</p>
              <p className="mt-3 text-slate-600 leading-7">Un asistente que mantiene la conversación, sugiere el próximo paso y te notifica cuando hay cambios importantes en tu plan.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Beneficios</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Lo que hace única a INARA</h2>
          </div>
          <p className="max-w-xl text-slate-600">Beneficios construidos para transformar la educación y apoyar a cada estudiante en su camino.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="platform-benefit-card p-6">
              <div className="text-4xl">{benefit.icon}</div>
              <p className="mt-4 text-xl font-bold text-slate-950">{benefit.title}</p>
              <p className="mt-3 text-slate-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="platform-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Misión</p>
          <h3 className="mt-4 text-2xl font-black text-slate-950">Transformar la educación mediante tecnología inteligente</h3>
          <p className="mt-5 text-slate-600 leading-8">
            Transformar la educación mediante tecnología inteligente que motive, acompañe y fortalezca el aprendizaje de cada estudiante.
          </p>
        </div>
        <div className="platform-card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Visión</p>
          <h3 className="mt-4 text-2xl font-black text-slate-950">Ser la plataforma educativa líder de Nicaragua y Centroamérica</h3>
          <p className="mt-5 text-slate-600 leading-8">
            Convertirse en la plataforma educativa inteligente líder de Nicaragua y Centroamérica.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">ODS</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Objetivos de Desarrollo Sostenible</h2>
          </div>
          <p className="max-w-xl text-slate-600">Compromiso con la calidad educativa, la innovación y las alianzas estratégicas.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {odsItems.map((item) => (
            <div key={item.label} className="platform-ods-card p-6">
              <p className="text-lg font-black text-slate-950">{item.label}</p>
              <p className="mt-3 text-xl font-semibold text-slate-800">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Noticias</p>
            <h2 className="platform-section-title mt-3 text-3xl text-slate-950">Últimas novedades</h2>
          </div>
          <p className="max-w-xl text-slate-600">Mantente al día con los anuncios más importantes de INARA.</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {newsItems.map((news) => (
            <div key={news.title} className="platform-news-card p-6">
              <p className="text-sm font-semibold text-emerald-700">Actualidad</p>
              <p className="mt-4 text-xl font-bold text-slate-950">{news.title}</p>
              <p className="mt-3 text-slate-600">{news.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-slate-200 pt-10 text-slate-600">
        <div className="platform-footer-grid gap-6">
          <div className="platform-footer-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Versión</p>
            <p className="mt-3 text-xl font-bold text-slate-950">1.0.0 Demo</p>
          </div>
          <div className="platform-footer-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Equipo</p>
            <p className="mt-3 text-xl font-bold text-slate-950">Colonial Code</p>
          </div>
          <div className="platform-footer-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Evento</p>
            <p className="mt-3 text-xl font-bold text-slate-950">Hackathon Nicaragua 2026</p>
          </div>
          <div className="platform-footer-card p-6 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Contacto</p>
            <p className="text-slate-600">Repositorio GitHub</p>
            <p className="text-slate-600">Licencia abierta</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
