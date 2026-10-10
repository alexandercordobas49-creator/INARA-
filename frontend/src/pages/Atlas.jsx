import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import AtlasDashboard from './AtlasDashboard.jsx';

export default function Atlas({ session, users, selectedStudent }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const isStudent = session?.user?.role === 'student';
  const students = isStudent ? [session.user] : users.filter((user) => user.role === 'student');
  const [studentId, setStudentId] = useState(selectedStudent?.id || '');
  const [error, setError] = useState('');
  const latestRequest = useRef(0);
  const activeStudent = students.find((student) => student.id === studentId);
  function selectStudent(nextStudentId) {
    latestRequest.current += 1;
    setStudentId(nextStudentId);
    setResult(null);
    setError('');
    setLoading(false);
  }

  useEffect(() => {
    if (isStudent) {
      setStudentId(session.user.id);
    } else if (studentId && !students.some((student) => student.id === studentId)) {
      setStudentId('');
    } else if (!studentId && students.length === 1) {
      setStudentId(students[0].id);
    }
  }, [isStudent, session?.user?.id, students, studentId]);

  async function ask() {
    if (!question.trim() || !activeStudent?.id) return;
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const response = await api('/atlas/ask', {
        method: 'POST',
        body: JSON.stringify({ question, userId: activeStudent.id })
      });
      if (requestId === latestRequest.current) setResult(response);
    } catch (requestError) {
      if (requestId !== latestRequest.current) return;
      console.error('Error consultando Atlas:', requestError);
      setError(requestError.message || 'No se pudo consultar Atlas.');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }

  return (
    <AtlasDashboard
      question={question}
      setQuestion={setQuestion}
      result={result}
      loading={loading}
      ask={ask}
      students={students}
      studentId={activeStudent?.id || ''}
      onStudentChange={selectStudent}
      isStudent={isStudent}
      error={error}
    />
  );
}