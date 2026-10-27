export default function Courses({ session, courses = [] }) {
  const palette = [
    { icon: '📘', color: 'from-emerald-500 to-teal-600' },
    { icon: '💻', color: 'from-sky-500 to-cyan-600' },
    { icon: '🧠', color: 'from-amber-500 to-orange-500' },
    { icon: '🌎', color: 'from-indigo-500 to-violet-600' }
  ];
  const myCourses = courses.map((course, index) => ({
    ...course,
    icon: palette[index % palette.length].icon,
    color: palette[index % palette.length].color,
    instructor: course.instructor_name || 'Equipo docente',
    students: Number(course.student_count || 0),
    lastAccess: 'Seguimiento activo',
    status: course.status === 'active' ? 'En progreso' : course.status
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
          Mis Clases
        </h1>
        <p className="text-slate-600 mt-2">Accede a tus cursos y continúa aprendiendo</p>
      </div>

      {/* Filter/Sort */}
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-sm">
          Todas
        </button>
        <button className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200">
          En progreso
        </button>
        <button className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200">
          Completadas
        </button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myCourses.length === 0 ? <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center"><p className="text-lg font-bold text-emerald-900">Tus clases aparecerán aquí</p><p className="mt-2 text-sm text-emerald-800">Cuando se cargue el piloto de Valeria, verás los cursos y la cantidad de compañeros matriculados.</p></div> : myCourses.map((course) => (
          <div
            key={course.id}
            className="rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            {/* Header with Icon */}
            <div className={`bg-gradient-to-br ${course.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{course.icon}</span>
                <span className="text-sm font-bold bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  {course.status}
                </span>
              </div>
              <h3 className="text-xl font-bold">{course.name}</h3>
              <p className="text-sm text-white text-opacity-90 mt-1">{course.instructor}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="flex justify-between text-sm">
                <div className="space-y-2">
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-900">👥</span> {course.students} estudiantes
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-900">🕐</span> {course.lastAccess}
                  </p>
                </div>
              </div>

              {/* Button */}
              <button className={`w-full py-2 px-4 rounded-lg font-semibold text-white bg-gradient-to-r ${course.color} hover:shadow-lg transition-all duration-300`}>
                Continuar →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
