import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { api, notify } from '../api.js';
import Panel from '../components/Panel.jsx';
import './Attendance.css';

export default function Attendance({ users = [], courses = [], reload }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    userId: '',
    courseId: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    status: 'present',
    notes: ''
  });

  const students = useMemo(
    () => users.filter((user) => user.role === 'student'),
    [users]
  );

  const valeriaUser = useMemo(
    () =>
      students.find(
        (student) =>
          student.firstName?.toLowerCase() === 'valeria'
      ),
    [students]
  );

  /*
   * Datos de ejemplo para que la interfaz no quede vacía
   * cuando todavía no existen registros reales.
   */
  const fallbackAttendanceDetails = [
    {
      id: 'fallback-1',
      course_name: 'Inglés Conversacional',
      session_date: '2026-06-20',
      status: 'present',
      notes: 'Asistió a tiempo'
    },
    {
      id: 'fallback-2',
      course_name: 'Tecnologías Digitales',
      session_date: '2026-06-21',
      status: 'late',
      notes: 'Llegó tarde pero asistió'
    }
  ];

  /*
   * Inicializar estudiante y curso.
   */
  useEffect(() => {
    setForm((current) => {
      let next = current;

      if (valeriaUser && current.userId !== valeriaUser.id) {
        next = {
          ...next,
          userId: valeriaUser.id
        };
      } else if (!current.userId && students[0]) {
        next = {
          ...next,
          userId: students[0].id
        };
      }

      if (!current.courseId && courses[0]) {
        next = {
          ...next,
          courseId: courses[0].id
        };
      }

      return next;
    });
  }, [students, courses, valeriaUser]);

  /*
   * Cargar registros.
   */
  useEffect(() => {
    loadRecords();
  }, [valeriaUser]);

  async function loadRecords() {
    try {
      const endpoint = valeriaUser
        ? `/attendance?userId=${encodeURIComponent(valeriaUser.id)}`
        : '/attendance';

      const data = await api(endpoint);

      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);

      setRecords([]);

      notify(
        'error',
        error.message || 'Error cargando registros'
      );
    }
  }

  /*
   * Guardar asistencia.
   */
  const handleSubmit = async () => {
    if (!form.userId || !form.courseId) {
      setModal({
        type: 'warning',
        title: 'Campos requeridos',
        message:
          'Por favor selecciona un estudiante y un curso antes de guardar.',
        isOpen: true
      });

      return;
    }

    try {
      setLoading(true);

      await api('/attendance', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      await loadRecords();

      if (typeof reload === 'function') {
        await reload();
      }

      const student = students.find(
        (studentItem) => studentItem.id === form.userId
      );

      setModal({
        type: 'success',
        title: '¡Asistencia registrada!',
        message: `Se ha registrado la asistencia de ${
          student?.firstName || 'Estudiante'
        } como "${form.status.toUpperCase()}" en la clase del ${
          form.sessionDate
        }.`,
        isOpen: true
      });

      setForm({
        userId: valeriaUser?.id || '',
        courseId: courses[0]?.id || '',
        sessionDate: new Date().toISOString().slice(0, 10),
        status: 'present',
        notes: ''
      });
    } catch (error) {
      console.error(error);

      setModal({
        type: 'error',
        title: 'Error al guardar',
        message:
          error.message ||
          'Hubo un problema al registrar la asistencia.',
        isOpen: true
      });
    } finally {
      setLoading(false);
    }
  };

  /*
   * Limpiar formulario.
   */
  const handleReset = () => {
    setForm({
      userId: valeriaUser?.id || '',
      courseId: courses[0]?.id || '',
      sessionDate: new Date().toISOString().slice(0, 10),
      status: 'present',
      notes: ''
    });

    setModal({
      type: 'info',
      title: 'Formulario limpiado',
      message:
        'Los campos se han restablecido. Puedes registrar una nueva asistencia.',
      isOpen: true
    });
  };

  /*
   * Filtrar registros.
   */
  const displayRecords = useMemo(() => {
    if (valeriaUser) {
      return records;
    }

    return records.filter((record) => {
      const firstName = (
        record.user?.firstName ||
        record.first_name ||
        ''
      )
        .toString()
        .trim()
        .toLowerCase();

      return firstName === 'valeria';
    });
  }, [records, valeriaUser]);

  const recordsToShow =
    displayRecords.length > 0
      ? displayRecords
      : fallbackAttendanceDetails;

  const usingFallback = displayRecords.length === 0;

  const studentName = valeriaUser
    ? `${valeriaUser.firstName} ${valeriaUser.lastName || ''}`.trim()
    : 'Valeria';

  const attendanceLabel = `${recordsToShow.length} asistencia${
    recordsToShow.length === 1 ? '' : 's'
  }`;

  /*
   * Estadísticas.
   */
  const statusCounts = useMemo(() => {
    return recordsToShow.reduce(
      (acc, record) => {
        const status = record.status || 'absent';

        acc[status] = (acc[status] || 0) + 1;

        return acc;
      },
      {
        present: 0,
        late: 0,
        absent: 0,
        excused: 0
      }
    );
  }, [recordsToShow]);

  const handleViewStats = () => {
    const totalRecords = recordsToShow.length;

    const present =
      recordsToShow.filter(
        (record) => record.status === 'present'
      ).length;

    const attendance =
      totalRecords > 0
        ? ((present / totalRecords) * 100).toFixed(1)
        : 0;

    setModal({
      type: 'info',
      title: 'Estadísticas de Asistencia',
      message:
        `📊 Total de registros: ${totalRecords}\n` +
        `✅ Asistencias: ${present}\n` +
        `📈 Porcentaje: ${attendance}%\n\n` +
        'Sigue mejorando tu asistencia y alcanza 95% para el bono de racha.',
      isOpen: true
    });
  };

  /*
   * Formatear datos.
   */
  function formatCourse(record) {
    return record.course?.name || record.course_name || 'Sin curso';
  }

  function formatDate(value) {
    if (!value) return '';

    try {
      const date = new Date(value);

      return date.toLocaleDateString('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
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
      <Modal
        isOpen={modal?.isOpen || false}
        title={modal?.title || ''}
        message={modal?.message || ''}
        type={modal?.type || 'info'}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Sistema de Asistencia
          </h1>

          <p className="mt-2 text-slate-600">
            Registra asistencia. Presente y tarde suman XP y
            actualizan rachas.
          </p>
        </div>

        <Panel title="Consejo rápido">
          <p className="text-sm text-slate-600">
            Los registros de Presente y Tarde suman XP y
            fortalecen la racha de Valeria.
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Registrar asistencia">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Estudiante
                </label>

                <select
                  className="attendance-form-control"
                  value={form.userId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      userId: event.target.value
                    })
                  }
                >
                  <option value="">
                    Seleccionar estudiante
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Curso
                </label>

                <select
                  className="attendance-form-control"
                  value={form.courseId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      courseId: event.target.value
                    })
                  }
                >
                  <option value="">
                    Seleccionar curso
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Fecha
                </label>

                <input
                  className="attendance-form-control"
                  type="date"
                  value={form.sessionDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sessionDate: event.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Estado
                </label>

                <select
                  className="attendance-form-control"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value
                    })
                  }
                >
                  <option value="present">Presente</option>
                  <option value="late">Tarde</option>
                  <option value="absent">Ausente</option>
                  <option value="excused">Justificado</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notas
                </label>

                <textarea
                  className="attendance-form-control attendance-form-textarea"
                  placeholder="Agregar detalle o comentario"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value
                    })
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Resumen de asistencia">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {studentName}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Revisa el estado de las asistencias y ajusta
                  nuevos registros desde el formulario de la izquierda.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    Presente
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {statusCounts.present}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    Tarde
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {statusCounts.late}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">
                    Ausente
                  </p>

                  <p className="mt-1 text-2xl font-bold text-rose-700">
                    {statusCounts.absent}
                  </p>
                </div>

                <div className="rounded-xl bg-sky-50 p-4">
                  <p className="text-sm text-sky-700">
                    Justificado
                  </p>

                  <p className="mt-1 text-2xl font-bold text-sky-700">
                    {statusCounts.excused}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleViewStats}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                📊 Ver estadísticas completas
              </button>
            </div>
          </Panel>
        </div>

        <Panel title="Últimos registros">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-800">
                Últimos registros guardados en el sistema.
              </p>

              <p className="text-sm text-slate-500">
                {studentName} tiene {attendanceLabel}.
              </p>

              {usingFallback && (
                <p className="mt-1 text-sm text-amber-600">
                  Mostrando un ejemplo con contenido listo para
                  la interfaz.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={loadRecords}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              🔄 Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                    Clase
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                    Estado
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">
                    Notas
                  </th>
                </tr>
              </thead>

              <tbody>
                {recordsToShow.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-4 text-sm text-slate-800">
                      {formatCourse(record)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(
                        record.session_date ||
                          record.sessionDate
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`attendance-table-status attendance-status-${record.status} ${statusPalette(
                          record.status
                        )}`}
                      >
                        {translateStatus(record.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {record.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usingFallback && (
            <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <strong>Detalles de muestra</strong>
              <p className="mt-1">
                Mostrando 2 asistencias de ejemplo mientras
                esperamos los datos reales de la plataforma.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}