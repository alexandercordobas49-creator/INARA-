import Panel from '../components/Panel.jsx';
import StudentSelector from '../components/StudentSelector.jsx';

export default function AtlasDashboard({
  question,
  setQuestion,
  result,
  loading,
  ask,
  students,
  studentId,
  onStudentChange,
  isStudent,
  error
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Atlas</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Resumen de progreso</h1>
        <p className="mt-2 text-slate-600">
          Consulta el resumen del estudiante basado únicamente en los datos registrados en INARA.
        </p>
      </header>

      <Panel title="Consultar resumen">
        {!isStudent && (
          <div className="mb-4">
            <StudentSelector students={students} value={studentId} onChange={onStudentChange} />
          </div>
        )}
        <label className="block text-sm font-semibold text-slate-700" htmlFor="atlas-question">
          Pregunta
        </label>
        <textarea
          id="atlas-question"
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3"
          maxLength={1000}
          placeholder="Escribe una pregunta sobre el progreso registrado…"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={ask}
          disabled={loading || !question.trim() || !studentId}
        >
          {loading ? 'Consultando…' : 'Consultar'}
        </button>
        {!studentId && <p className="mt-3 text-sm text-slate-600">Selecciona un estudiante autorizado para consultar sus datos.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
      </Panel>

      {result && (
        <Panel title="Resumen disponible">
          <p className="text-slate-800">{result.answer}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-sm text-slate-500">XP</dt><dd className="font-bold">{result.metrics.totalXp ?? 'No disponible'}</dd></div>
            <div><dt className="text-sm text-slate-500">Nivel</dt><dd className="font-bold">{result.metrics.currentLevel ?? 'No disponible'}</dd></div>
            <div><dt className="text-sm text-slate-500">Racha</dt><dd className="font-bold">{result.metrics.currentStreak} días</dd></div>
            <div><dt className="text-sm text-slate-500">Asistencia</dt><dd className="font-bold">{result.metrics.attendanceRate === null ? 'Sin registros' : `${result.metrics.attendanceRate}%`}</dd></div>
          </dl>
          <p className="mt-5 text-sm text-slate-500">{result.note}</p>
        </Panel>
      )}
    </div>
  );
}
