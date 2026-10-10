import { useEffect, useState } from 'react';
import { api } from './api.js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Achievements from './pages/Achievements.jsx';
import Atlas from './pages/Atlas.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Progress from './pages/Progress.jsx';
import Courses from './pages/Courses.jsx';
import Goals from './pages/Goals.jsx';
import Rewards from './pages/Rewards.jsx';
import Community from './pages/Community.jsx';
import PlatformInfo from './pages/PlatformInfo.jsx';
import Attendance from './pages/Attendance.jsx';

function normalizeSession(value) {
  if (!value || typeof value.token !== 'string' || !value.user?.id) return null;
  return {
    ...value,
    user: {
      ...value.user,
      firstName: value.user.firstName || value.user.first_name || '',
      lastName: value.user.lastName || value.user.last_name || ''
    }
  };
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('INARA-session');
      const normalized = saved ? normalizeSession(JSON.parse(saved)) : null;
      if (saved && !normalized) localStorage.removeItem('INARA-session');
      return normalized;
    } catch {
      localStorage.removeItem('INARA-session');
      return null;
    }
  });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCatalogs();
  }, [refreshKey, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    function expireSession() {
      setSession(null);
      localStorage.removeItem('INARA-session');
    }

    window.addEventListener('inara-session-expired', expireSession);
    return () => window.removeEventListener('inara-session-expired', expireSession);
  }, []);

  async function loadCatalogs() {
    if (!session?.user) {
      setUsers([]);
      setCourses([]);
      return;
    }

    const usersPath = session.user.role === 'admin' ? '/users' : '/users/accessible-students';
    const [usersResult, coursesResult] = await Promise.allSettled([
      api(usersPath),
      api('/courses')
    ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value);
    } else {
      console.error('Unable to load authorized user catalog:', usersResult.reason);
      setUsers([]);
    }

    if (coursesResult.status === 'fulfilled') {
      setCourses(coursesResult.value);
    } else {
      console.error('Unable to load authorized course catalog:', coursesResult.reason);
      setCourses([]);
    }
  }

  function saveSession(nextSession) {
    const normalized = normalizeSession(nextSession);
    if (!normalized) throw new Error('La respuesta de autenticación no contiene una sesión válida');
    setSession(normalized);
    localStorage.setItem('INARA-session', JSON.stringify(normalized));
    reload();
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Unable to revoke server session during logout:', error);
    } finally {
      setSession(null);
      localStorage.removeItem('INARA-session');
    }
  }

  function reload() {
    setRefreshKey((value) => value + 1);
  }

  const selectedStudent = session?.user?.role === 'student' ? session.user : null;
  const profile = users.find((user) => user.id === session?.user?.id) || session?.user;
  const pageProps = { session, users, courses, selectedStudent, reload };

  return (
    <BrowserRouter>
      <AppShell session={session} profile={profile} onLogout={logout}>
        <Routes>
          <Route path="/auth" element={<Auth onSession={saveSession} />} />
          <Route path="/dashboard" element={session ? <Dashboard {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/progress" element={session ? <Progress {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/courses" element={session ? <Courses {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/goals" element={session ? <Goals {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/rewards" element={session ? <Rewards {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/atlas" element={session ? <Atlas {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/attendance" element={session ? <Attendance {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/platform" element={session ? <PlatformInfo {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/community" element={session ? <Community {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/achievements" element={session ? <Achievements {...pageProps} /> : <Navigate to="/auth" replace />} />
          <Route path="/" element={<Navigate to={session ? '/dashboard' : '/auth'} replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
