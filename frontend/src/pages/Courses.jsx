export default function Courses({ session, courses }) {
  const headings = {
    student: ['Mis clases', 'Cursos en los que tienes matrícula activa'],
    parent: ['Cursos vinculados', 'Cursos asociados a los estudiantes vinculados a tu cuenta'],
    instructor: ['Cursos impartidos', 'Cursos asignados a tu cuenta docente'],
    admin: ['Cursos', 'Cursos registrados en la plataforma']
  };
  const [title, description] = headings[session?.user?.role] || headings.student;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </header>
      {courses.length ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{course.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Estado: {course.status || 'No especificado'}
                  </p>
                </div>
                <span aria-hidden="true" className="text-3xl">📚</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No hay cursos disponibles en tu ámbito autorizado.
        </p>
      )}
    </div>
  );
}
