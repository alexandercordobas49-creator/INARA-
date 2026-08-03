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

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('INARA-session');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCatalogs();
  }, [refreshKey]);

  async function loadCatalogs() {
    try {
      const [usersData, coursesData] = await Promise.all([api('/users'), api('/courses')]);
      setUsers(usersData);
      setCourses(coursesData);
    } catch (error) {
      console.error(error);
    }
  }

  function saveSession(nextSession) {
    setSession(nextSession);
    localStorage.setItem('INARA-session', JSON.stringify(nextSession));
    reload();
  }

  function logout() {
    setSession(null);
    localStorage.removeItem('INARA-session');
  }

  function reload() {
    setRefreshKey((value) => value + 1);
  }

  const selectedStudent =
    session?.user?.role === 'student' ? session.user : users.find((user) => user.role === 'student');
  const pageProps = { session, users, courses, selectedStudent, reload };

  return (
    <BrowserRouter>
      <AppShell session={session} onLogout={logout}>
        <Routes>
          <Route path="/auth" element={<Auth onSession={saveSession} />} />
          <Route path="/dashboard" element={<Dashboard {...pageProps} />} />
          <Route path="/progress" element={<Progress {...pageProps} />} />
          <Route path="/courses" element={<Courses {...pageProps} />} />
          <Route path="/goals" element={<Goals {...pageProps} />} />
          <Route path="/rewards" element={<Rewards {...pageProps} />} />
          <Route path="/atlas" element={<Atlas {...pageProps} />} />
          <Route path="/attendance" element={<Attendance {...pageProps} />} />
          <Route path="/platform" element={<PlatformInfo {...pageProps} />} />
          <Route path="/community" element={<Community {...pageProps} />} />
          <Route path="/achievements" element={<Achievements {...pageProps} />} />
          <Route path="/" element={<Navigate to={session ? '/dashboard' : '/auth'} replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
