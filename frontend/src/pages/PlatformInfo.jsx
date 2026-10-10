import './PlatformInfo.css';

const capabilities = [
  {
    title: 'Cuentas y permisos',
    description: 'El acceso a los datos se limita según la sesión y el rol autenticado.'
  },
  {
    title: 'Cursos y matrículas',
    description: 'El catálogo muestra los cursos dentro del ámbito permitido a cada cuenta.'
  },
  {
    title: 'Asistencia y XP',
    description: 'Los registros se guardan en PostgreSQL; la XP por asistencia se concede una sola vez.'
  },
  {
    title: 'Progreso y logros',
    description: 'Los resúmenes se calculan a partir de registros almacenados y logros configurados.'
  },
  {
    title: 'Atlas',
    description: 'Atlas presenta un resumen basado en datos existentes; no genera respuestas con IA ni recomendaciones automáticas.'
  },
  {
    title: 'Metas y comunidad',
    description: 'La persistencia de metas, publicaciones, grupos y eventos todavía no está disponible.'
  }
];

export default function PlatformInfo() {
  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">INARA</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Información de la plataforma</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          INARA centraliza cuentas académicas, cursos, asistencias y seguimiento del progreso.
          La información de esta página describe el comportamiento conectado actualmente, sin métricas ni datos de muestra.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        {capabilities.map((capability) => (
          <article key={capability.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">{capability.title}</h2>
            <p className="mt-3 leading-6 text-slate-600">{capability.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
