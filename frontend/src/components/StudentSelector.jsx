export default function StudentSelector({ students, value, onChange, label = 'Estudiante' }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!students.length}
      >
        <option value="">Selecciona un estudiante</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.firstName || student.first_name} {student.lastName || student.last_name}
          </option>
        ))}
      </select>
    </label>
  );
}
