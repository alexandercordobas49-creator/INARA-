import { useEffect, useMemo, useState } from 'react';
import { api, notify } from '../api.js';
import ModuleHeader from '../components/ModuleHeader.jsx';
import Panel from '../components/Panel.jsx';

export default function Attendance({ users, courses, reload }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    userId: '',
    courseId: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    status: 'present',
    notes: ''
  });
  const students = users.filter((user) => user.role === 'student');
  const valeriaUser = students.find((student) => student.firstName?.toLowerCase() === 'valeria');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (valeriaUser) {
      setForm((value) => ({ ...value, userId: valeriaUser.id }));
    } else if (!form.userId && students[0]) {
      setForm((value) => ({ ...value, userId: students[0].id }));
    }

    if (!form.courseId && courses[0]) {
      setForm((value) => ({ ...value, courseId: courses[0].id }));
    }
  }, [students, courses, valeriaUser, form.userId, form.courseId]);

  useEffect(() => {
    loadRecords();
  }, [valeriaUser]);

  async function loadRecords() {
    try {
      const endpoint = valeriaUser ? `/attendance?userId=${encodeURIComponent(valeriaUser.id)}` : '/attendance';
      setRecords(await api(endpoint));
    } catch (error) {
      console.error(error);
      notify('error', error.message || 'Error cargando registros');
    }
  }

  async function saveRecord() {
    if (!form.userId || !form.courseId) {
      notify('error', 'Selecciona estudiante y curso antes de guardar');
      return;
    }

    try {
      setLoading(true);

      await api('/attendance', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      await loadRecords();
      reload();
      notify('success', 'Asistencia guardada correctamente');
    } catch (error) {
      console.error(error);
      notify('error', error.message || 'Error guardando registro');
    } finally {
      setLoading(false);
    }
  }

  const fallbackAttendanceDetails = [
    {
      id: 'fallback-1',
      course_name: 'Ingles Conversacional',
      session_date: '2026-06-20',
      status: 'present',
      notes: 'Asistió a tiempo'
    },
    {
      id: 'fallback-2',
      course_name: 'Tecnologias Digitales',
      session_date: '2026-06-21',
      status: 'late',
      notes: 'Llegó tarde pero asistió'
    }
  ];

  const displayRecords = useMemo(() => {
    if (valeriaUser) {
      return records;
    }

    return records.filter((record) => {
      const firstName = (record.user?.firstName || record.first_name || '').toString().trim().toLowerCase();
      return firstName === 'valeria';
    });
  }, [records, valeriaUser]);

  const recordsToShow = displayRecords.length > 0 ? displayRecords : fallbackAttendanceDetails;
  const usingFallback = displayRecords.length === 0;
  const studentName = valeriaUser ? `${valeriaUser.firstName} ${valeriaUser.lastName}` : 'Valeria';
  const attendanceLabel = `${recordsToShow.length} asistencia${recordsToShow.length === 1 ? '' : 's'}`;

  const statusCounts = useMemo(() => {
    return recordsToShow.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, { present: 0, late: 0, absent: 0, excused: 0 });
  }, [recordsToShow]);

  function formatStudent(record) {
    return (record.user?.firstName && record.user?.lastName)
      ? `${record.user.firstName} ${record.user.lastName}`
      : `${record.first_name || ''} ${record.last_name || ''}`.trim();
  }

  function formatCourse(record) {
    return record.course?.name || record.course_name || '';
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return value;
    }
  }

  function translateStatus(status) {
    const map = {
      present: 'Presente',
      late: 'Tarde',
      absent: 'Ausente',
      excused: 'Justificado'
    };

    return map[status] || status;
  }

  function statusPalette(status) {
    const map = {
      present: 'bg-emerald-100 text-emerald-700',
      late: 'bg-amber-100 text-amber-700',
      absent: 'bg-rose-100 text-rose-700',
      excused: 'bg-sky-100 text-sky-700'
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  return (
    <>
      <ModuleHeader eyebrow="Modulo 3" title="Sistema de asistencia" description="Registra asistencia. Presente y tarde suman XP y actualizan rachas." />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Panel title="Agregar asistencia">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              <p className="font-semibold text-slate-900">Consejo rápido</p>
              <p>Los registros de <span className="font-semibold">Presente</span> y <span className="font-semibold">Tarde</span> suman XP y fortalecen la racha de Valeria.</p>
            </div>
            <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Estudiante</label>
                <select className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Curso</label>
                <select className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Fecha</label>
                  <input className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Estado</label>
                  <select className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="present">Presente</option>
                    <option value="late">Tarde</option>
                    <option value="absent">Ausente</option>
                    <option value="excused">Justificado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Notas</label>
                <textarea className="mt-2 min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder="Agregar detalle o comentario" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  onClick={() => setForm((prev) => ({ ...prev, notes: '', status: 'present', sessionDate: new Date().toISOString().slice(0, 10) }))}
                >
                  Limpiar
                </button>
                <button
                  className={`rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-lg transition duration-300 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-xl hover:scale-[1.01]'}`}
                  type="button"
                  onClick={saveRecord}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar asistencia'}
                </button>
              </div>
            </form>
          </div>
        </Panel>
        <section className="space-y-5">
          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.18)]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 shadow-sm">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Resumen de asistencia
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-3xl font-extrabold tracking-[-0.03em] text-slate-950">{studentName}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Revisa el estado de las asistencias y ajusta nuevos registros desde el formulario de la izquierda.</p>
              </div>
              <div className="rounded-3xl bg-white px-5 py-4 shadow-sm border border-slate-200">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Asistencias</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-950">{attendanceLabel}</p>
                <p className="mt-1 text-sm text-slate-500">{usingFallback ? 'Ejemplo de contenido mientras se cargan los datos reales.' : 'Datos basados en registros registrados.'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Presente</p>
              <p className="mt-4 text-3xl font-extrabold text-emerald-700">{statusCounts.present}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Tarde</p>
              <p className="mt-4 text-3xl font-extrabold text-amber-700">{statusCounts.late}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Ausente</p>
              <p className="mt-4 text-3xl font-extrabold text-rose-700">{statusCounts.absent}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Justificado</p>
              <p className="mt-4 text-3xl font-extrabold text-sky-700">{statusCounts.excused}</p>
            </div>
          </div>
          <Panel title="📝 Registros recientes">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Últimos registros guardados en el sistema.</p>
                <p className="mt-1 text-xs text-slate-400">Haz clic para recuperar los datos más recientes.</p>
                <p className="mt-3 text-sm font-semibold text-slate-700">{studentName} tiene {attendanceLabel}.</p>
                {usingFallback && <p className="mt-2 text-sm text-slate-500">Mostrando un ejemplo con contenido listo para la interfaz.</p>}
              </div>
              <button type="button" className="group relative inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={loadRecords}>
                <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Actualizar
                <span className="pointer-events-none absolute -right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100">
                  Refrescar
                </span>
              </button>
            </div>
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Clase</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recordsToShow.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-900">{formatCourse(record)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(record.session_date || record.sessionDate)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPalette(record.status)}`}>{translateStatus(record.status)}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{record.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usingFallback && (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 shadow-sm">
                <p className="font-semibold text-slate-900">Detalles de muestra</p>
                <p className="mt-2">Mostrando 2 asistencias de ejemplo mientras esperamos los datos reales de la plataforma.</p>
              </div>
            )}
          </Panel>
        </section>
      </div>
    </>
  );
}
