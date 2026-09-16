import { useEffect, useState } from 'react';
import { api } from '../api.js';

const actionLabels = {
  CONTACT: 'Contacto con el estudiante',
  MEETING: 'Reunión',
  ACADEMIC_SUPPORT: 'Apoyo académico',
  MOTIVATION: 'Acompañamiento motivacional',
  PARENT_CONTACT: 'Contacto con la familia',
  FOLLOW_UP: 'Seguimiento',
  OTHER: 'Otro'
};

const levelLabels = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  critical: 'Crítico'
};

function levelClass(level) {
  return {
    low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-rose-100 text-rose-800 border-rose-200'
  }[level] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatDate(value) {
  if (!value) return 'Sin evaluación';
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(value));
}

export default function RiskFollowUp() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [actionType, setActionType] = useState('CONTACT');
  const [status, setStatus] = useState('COMPLETED');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  async function loadStudents() {
    setLoading(true);
    try {
      const result = await api('/risk/students');
      setStudents(result.students || []);
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el seguimiento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null);
      return;
    }
    api(`/risk/${selectedStudentId}`).then(setStudentDetail).catch(() => setStudentDetail(null));
  }, [selectedStudentId]);

  async function evaluate(studentId) {
    setBusyId(studentId);
    setMessage('');
    try {
      await api(`/risk/evaluate/${studentId}`, { method: 'POST' });
      await loadStudents();
      setMessage('Evaluación actualizada con datos de PostgreSQL.');
    } catch (error) {
      setMessage(error.message || 'No se pudo evaluar el riesgo.');
    } finally {
      setBusyId(null);
    }
  }

  async function registerIntervention(student) {
    setBusyId(student.studentId);
    setMessage('');
    try {
      await api('/risk/interventions', {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.studentId,
          riskId: student.id || null,
          actionType,
          notes,
          status,
          followUpDate: followUpDate || null,
          recommendationId: student.recommendationId || null
        })
      });
      setNotes('');
      setSelectedStudentId(null);
      await loadStudents();
      setMessage('Seguimiento registrado. Puedes reevaluar al estudiante para observar cambios.');
    } catch (error) {
      setMessage(error.message || 'No se pudo registrar la intervención.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Prevención del abandono</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Estudiantes que requieren seguimiento</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          INARA combina señales reales de asistencia, actividad, racha y progreso para orientar la siguiente acción docente.
        </p>
      </header>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800" role="status">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">Cargando señales de estudiantes...</div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          No hay estudiantes asignados para evaluar con este usuario.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {students.map((student) => {
            const factors = Array.isArray(student.factors) ? student.factors : [];
            const isSelected = selectedStudentId === student.studentId;
            return (
              <article key={student.studentId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">{student.firstName} {student.lastName}</h2>
                    <p className="mt-1 text-sm text-slate-500">Última evaluación: {formatDate(student.lastEvaluatedAt)}</p>
                  </div>
                  {student.level ? (
                    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${levelClass(student.level)}`}>
                      Riesgo {levelLabels[student.level]}
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">Sin evaluar</span>
                  )}
                </div>

                {student.riskScore !== null && student.riskScore !== undefined ? (
                  <>
                    <div className="mt-5 flex items-end gap-2">
                      <span className="text-4xl font-black text-slate-950">{student.riskScore}</span>
                      <span className="pb-1 text-sm font-semibold text-slate-500">/ 100 de riesgo</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Factores principales</p>
                      {factors.length ? (
                        <ul className="mt-2 space-y-2 text-sm text-slate-700">
                          {factors.slice(0, 3).map((factor) => <li key={`${student.studentId}-${factor.code}-${factor.label}`}>• {factor.label}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">No se detectaron señales relevantes.</p>
                      )}
                    </div>

                    <div className="mt-5 rounded-2xl bg-cyan-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-800">Recomendación de Atlas</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{student.recommendationMessage || 'Evaluar nuevamente para generar una recomendación.'}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                      <span>Asistencia: {student.attendanceScore ?? 0}/100</span>
                      <span>XP: {student.xpScore ?? 0}/100</span>
                      <span>Actividad: {student.engagementScore ?? 0}/100</span>
                      <span>Racha: {student.streakScore ?? 0}/100</span>
                    </div>

                    {student.lastInterventionType && (
                      <p className="mt-4 text-xs font-semibold text-slate-500">
                        Última acción: {actionLabels[student.lastInterventionType] || student.lastInterventionType} · {formatDate(student.lastInterventionAt)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aún no hay una evaluación persistida para este estudiante.</p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => evaluate(student.studentId)}
                    disabled={busyId === student.studentId}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === student.studentId ? 'Procesando...' : student.riskScore ? 'Reevaluar' : 'Evaluar ahora'}
                  </button>
                  {student.riskScore && (
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(isSelected ? null : student.studentId)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {isSelected ? 'Cerrar seguimiento' : 'Registrar seguimiento'}
                    </button>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    {studentDetail?.history?.length > 0 && (
                      <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Historial de riesgo académico</p>
                        <div className="mt-3 space-y-2">
                          {studentDetail.history.slice().reverse().map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-slate-600">{formatDate(entry.createdAt)}</span>
                              <span className="font-black text-slate-900">{entry.riskScore}/100 · {levelLabels[entry.level]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="block text-sm font-bold text-slate-700" htmlFor={`action-${student.studentId}`}>Acción realizada</label>
                    <select id={`action-${student.studentId}`} value={actionType} onChange={(event) => setActionType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor={`status-${student.studentId}`}>Estado</label>
                    <select id={`status-${student.studentId}`} value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      <option value="PENDING">Pendiente</option>
                      <option value="IN_PROGRESS">En seguimiento</option>
                      <option value="COMPLETED">Intervención realizada</option>
                    </select>
                    <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor={`follow-up-${student.studentId}`}>Próximo seguimiento</label>
                    <input id={`follow-up-${student.studentId}`} type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor={`notes-${student.studentId}`}>Notas</label>
                    <textarea id={`notes-${student.studentId}`} value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Describe el seguimiento realizado." />
                    <button type="button" onClick={() => registerIntervention(student)} disabled={busyId === student.studentId} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60">
                      Guardar intervención
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
