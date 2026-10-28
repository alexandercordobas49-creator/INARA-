import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { api, notify } from '../api.js';
import './Attendance.css';

const STATUS = {
  present: { label: 'Presente', icon: '✓', tone: 'emerald' },
  late: { label: 'Llegó tarde', icon: '◷', tone: 'amber' },
  absent: { label: 'Ausente', icon: '!', tone: 'rose' },
  excused: { label: 'Justificado', icon: '✓', tone: 'sky' }
};
const statusTone = {
  present: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  late: 'bg-amber-50 text-amber-800 ring-amber-200',
  absent: 'bg-rose-50 text-rose-800 ring-rose-200',
  excused: 'bg-sky-50 text-sky-800 ring-sky-200'
};
const today = () => new Date().toLocaleDateString('en-CA');

export default function Attendance({ users = [], courses = [], reload, session }) {
  const isStudent = session?.user?.role === 'student';
  const canRegister = ['admin', 'instructor'].includes(session?.user?.role);
  const currentUser = session?.user;
  const students = useMemo(() => users.filter((user) => user.role === 'student'), [users]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    userId: currentUser?.role === 'student' ? currentUser.id : '',
    courseId: '', sessionDate: today(), status: 'present', notes: ''
  });

  useEffect(() => {
    if (!form.courseId && courses[0]?.id) setForm((old) => ({ ...old, courseId: courses[0].id }));
    if (canRegister && !form.userId && students[0]?.id) setForm((old) => ({ ...old, userId: students[0].id }));
  }, [courses, students, canRegister, form.courseId, form.userId]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isStudent && currentUser?.id
        ? `/attendance?userId=${encodeURIComponent(currentUser.id)}`
        : '/attendance';
      const data = await api(endpoint);
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      setRecords([]);
      notify('error', error.message || 'No se pudo cargar la asistencia.');
    } finally { setLoading(false); }
  }, [isStudent, currentUser?.id]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const counts = useMemo(() => records.reduce((acc, row) => {
    const key = STATUS[row.status] ? row.status : 'absent';
    acc[key] += 1;
    return acc;
  }, { present: 0, late: 0, absent: 0, excused: 0 }), [records]);

  const attended = counts.present + counts.late;
  const rate = records.length ? Math.round(attended / records.length * 100) : 0;
  const visibleRecords = useMemo(() => records.filter((row) => {
    const matchesStatus = filter === 'all' || row.status === filter;
    const query = search.trim().toLocaleLowerCase('es');
    const course = row.course?.name || row.course_name || row.courseName || '';
    const name = [row.user?.firstName, row.user?.lastName, row.first_name, row.last_name].filter(Boolean).join(' ');
    return matchesStatus && (!query || course.toLocaleLowerCase('es').includes(query) || name.toLocaleLowerCase('es').includes(query));
  }), [records, filter, search]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.userId || !form.courseId || !form.sessionDate) {
      setModal({ type: 'warning', title: 'Faltan datos', message: 'Selecciona estudiante, curso y fecha para registrar la asistencia.', isOpen: true });
      return;
    }
    try {
      setSaving(true);
      await api('/attendance', { method: 'POST', body: JSON.stringify(form) });
      await loadRecords();
      if (typeof reload === 'function') await reload();
      notify('success', 'Asistencia registrada correctamente.');
      setForm((old) => ({ ...old, sessionDate: today(), status: 'present', notes: '' }));
    } catch (error) {
      setModal({ type: 'error', title: 'No se pudo guardar', message: error.message || 'Comprueba los datos e inténtalo de nuevo.', isOpen: true });
    } finally { setSaving(false); }
  }

  function formatDate(value) {
    if (!value) return '—';
    const dateOnly = String(value).slice(0, 10);
    const parsed = new Date(`${dateOnly}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? dateOnly : parsed.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function courseName(row) { return row.course?.name || row.course_name || row.courseName || 'Clase académica'; }
  function studentName(row) {
    return [row.user?.firstName || row.first_name, row.user?.lastName || row.last_name].filter(Boolean).join(' ') || (isStudent ? [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') : 'Estudiante');
  }

  const statCards = [
    { label: 'Sesiones registradas', value: records.length, icon: '▤', style: 'from-emerald-600 to-teal-500', sub: 'Historial de asistencia' },
    { label: 'Asistencia efectiva', value: `${rate}%`, icon: '✓', style: 'from-sky-600 to-cyan-500', sub: `${attended} sesiones presentes o tarde` },
    { label: 'Ausencias', value: counts.absent, icon: '!', style: 'from-rose-500 to-pink-500', sub: 'Para dar seguimiento oportuno' },
    { label: 'Justificaciones', value: counts.excused, icon: '✳', style: 'from-violet-600 to-indigo-500', sub: 'Registradas en el sistema' }
  ];

  return <>
    <Modal isOpen={modal?.isOpen || false} title={modal?.title || ''} message={modal?.message || ''} type={modal?.type || 'info'} actions={modal?.actions} onClose={() => setModal(null)} />
    <main className="attendance-container space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-600 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute bottom-[-80px] right-40 h-48 w-48 rounded-full bg-teal-300/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-50"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Seguimiento académico</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Asistencia que impulsa tu futuro</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">{isStudent ? 'Consulta tu historial, reconoce tus avances y mantén el ritmo de aprendizaje.' : 'Registra cada sesión y convierte la asistencia en una oportunidad para acompañar y motivar.'}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center backdrop-blur-sm"><div className="text-4xl">📅</div><p className="mt-2 text-sm font-bold">Cada día cuenta</p><p className="mt-1 text-xs text-emerald-50">Tu camino, paso a paso</p></div>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-xl bg-white/15 px-4 py-2 font-semibold">📚 {courses.length || '—'} cursos disponibles</span>
          <span className="rounded-xl bg-white/15 px-4 py-2 font-semibold">🔥 Presente y puntualidad importan</span>
          <button onClick={loadRecords} disabled={loading} className="rounded-xl bg-white px-4 py-2 font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60">{loading ? 'Actualizando…' : '↻ Actualizar datos'}</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{loading ? '…' : card.value}</p></div><div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.style} text-xl font-black text-white shadow-md`}>{card.icon}</div></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{card.sub}</p>
        </article>)}
      </section>

      <section className={`grid gap-6 ${canRegister ? 'xl:grid-cols-[1.05fr_.95fr]' : 'xl:grid-cols-[.8fr_1.2fr]'}`}>
        {canRegister && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl">✚</div><div><h2 className="text-xl font-extrabold text-slate-900">Registrar una sesión</h2><p className="mt-1 text-sm text-slate-500">Guarda la asistencia en el historial académico.</p></div></div>
          {students.length === 0 && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No hay estudiantes cargados para este rol. No se puede registrar hasta que el catálogo esté disponible.</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="attendance-student">Estudiante</label><select id="attendance-student" required className="attendance-form-control" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">Seleccionar estudiante</option>{students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="attendance-course">Curso</label><select id="attendance-course" required className="attendance-form-control" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Seleccionar curso</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="attendance-date">Fecha de la sesión</label><input id="attendance-date" required type="date" max={today()} className="attendance-form-control" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}/></div><div><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="attendance-status">Estado</label><select id="attendance-status" className="attendance-form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></div></div>
            <div><label className="mb-1.5 block text-sm font-bold text-slate-700" htmlFor="attendance-notes">Observaciones <span className="font-normal text-slate-400">(opcional)</span></label><textarea id="attendance-notes" className="attendance-form-control attendance-form-textarea" rows="3" maxLength="500" placeholder="Añade contexto útil para el seguimiento, sin etiquetar al estudiante…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></div>
            <div className="flex flex-wrap gap-3 pt-1"><button type="button" onClick={() => setForm({ userId: students[0]?.id || '', courseId: courses[0]?.id || '', sessionDate: today(), status: 'present', notes: '' })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Limpiar</button><button type="submit" disabled={saving || students.length === 0 || courses.length === 0} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando…' : '✓ Guardar asistencia'}</button></div>
          </form>
        </section>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-xl">◔</div><div><h2 className="text-xl font-extrabold text-slate-900">Resumen de asistencia</h2><p className="mt-1 text-sm text-slate-500">{isStudent ? 'Tu actividad académica registrada' : 'Vista general de los registros disponibles'}</p></div></div>
          <div className="mt-6 flex items-center gap-5 rounded-2xl bg-slate-50 p-4"><div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#059669 ${rate}%, #e2e8f0 0)` }}><div className="flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-full bg-white"><span className="text-xl font-black text-slate-900">{rate}%</span><span className="text-[10px] font-bold uppercase text-slate-400">efectiva</span></div></div><div><p className="font-extrabold text-slate-900">{rate >= 90 ? '¡Excelente constancia!' : rate >= 75 ? 'Vas construyendo el hábito' : 'Cada nuevo día cuenta'}</p><p className="mt-1 text-sm leading-5 text-slate-500">La asistencia efectiva incluye las sesiones presentes y las llegadas tarde.</p></div></div>
          <div className="mt-5 space-y-4">{Object.entries(STATUS).map(([key, value]) => <div key={key}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">{value.icon} {value.label}</span><span className="font-extrabold text-slate-900">{loading ? '…' : counts[key]}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${key === 'present' ? 'bg-emerald-500' : key === 'late' ? 'bg-amber-400' : key === 'absent' ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${records.length ? counts[key] / records.length * 100 : 0}%` }}/></div></div>)}</div>
          <p className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">INARA usa estos datos para facilitar el acompañamiento oportuno. Una ausencia es una señal para conversar y apoyar, nunca una etiqueta.</p>
        </section>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold text-slate-900">Historial de sesiones</h2><p className="mt-1 text-sm text-slate-500">{visibleRecords.length} registro(s) mostrados · datos conectados al sistema</p></div><div className="flex flex-wrap gap-2"><input aria-label="Buscar por curso o estudiante" className="attendance-form-control min-w-48" placeholder="Buscar curso o estudiante…" value={search} onChange={(e) => setSearch(e.target.value)}/><select aria-label="Filtrar por estado" className="attendance-form-control min-w-36" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></div></div></div>
        {loading ? <div className="space-y-3 p-6">{[1,2,3].map((n) => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div> : visibleRecords.length === 0 ? <div className="px-6 py-12 text-center"><div className="text-4xl">🗓️</div><h3 className="mt-3 font-extrabold text-slate-800">{records.length ? 'No hay coincidencias' : 'Aún no hay sesiones registradas'}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{records.length ? 'Cambia el filtro o el texto de búsqueda.' : 'Cuando se registre una sesión real, aparecerá aquí. No mostramos registros ficticios como si fueran reales.'}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead className="bg-slate-50 text-left"><tr>{(isStudent ? ['Curso', 'Fecha', 'Estado', 'Observaciones'] : ['Estudiante', 'Curso', 'Fecha', 'Estado', 'Observaciones']).map((label) => <th key={label} className="px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleRecords.map((row, index) => <tr key={row.id || `${row.session_date}-${index}`} className="transition hover:bg-emerald-50/50">{!isStudent && <td className="px-5 py-4 text-sm font-semibold text-slate-800">{studentName(row)}</td>}<td className="px-5 py-4 text-sm font-semibold text-slate-800">{courseName(row)}</td><td className="px-5 py-4 text-sm text-slate-600">{formatDate(row.session_date || row.sessionDate)}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${statusTone[row.status] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}><span>{STATUS[row.status]?.icon || '•'}</span>{STATUS[row.status]?.label || row.status}</span></td><td className="max-w-xs px-5 py-4 text-sm text-slate-500">{row.notes || '—'}</td></tr>)}</tbody></table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3"><p className="text-xs text-slate-500">Última consulta: {new Date().toLocaleString('es-NI')}</p><button type="button" onClick={loadRecords} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">↻ Actualizar historial</button></div>
      </section>
    </main>
  </>;
}
