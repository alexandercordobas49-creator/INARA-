import { readData, writeData, createId } from '../data/store.js';
import { sendEmailNotification, sendSmsNotification } from '../lib/notificationService.js';

function detectAlertsForStudent(data, student) {
  const attendance = data.attendance.filter((r) => r.userId === student.id);
  const attendanceSummary = {
    total: attendance.length,
    present: attendance.filter((r) => r.status === 'present').length,
    late: attendance.filter((r) => r.status === 'late').length,
    absent: attendance.filter((r) => r.status === 'absent').length
  };
  const streak = data.streaks.find((s) => s.userId === student.id) || { currentCount: 0 };

  const alerts = [];
  if (attendanceSummary.absent >= 3) alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
  if ((streak.currentCount || 0) <= 1) alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
  if ((student.totalXp || 0) < 200) alerts.push({ level: 'low', message: 'Progreso bajo en XP' });

  return alerts;
}

export async function runAlerts(req, res) {
  const data = readData();

  const notifications = [];

  const students = data.users.filter((u) => u.role === 'student');
  for (const student of students) {
    const alerts = detectAlertsForStudent(data, student);
    if (!alerts.length) continue;

    const relations = (data.parentRelations || []).filter((r) => r.childId === student.id);
    for (const rel of relations) {
      const parent = data.users.find((u) => u.id === rel.parentId);
      if (!parent) continue;

      for (const al of alerts) {
        const message = `Alerta para ${student.firstName} ${student.lastName}: ${al.message}`;
        const note = {
          id: createId('notification'),
          toUserId: parent.id,
          toEmail: parent.email,
          childId: student.id,
          level: al.level,
          message,
          channel: 'email',
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        data.notifications = data.notifications || [];
        data.notifications.push(note);
        notifications.push(note);

        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          try {
            const emailResult = await sendEmailNotification(parent.email, `Alerta INARA: ${student.firstName}`, `<p>${message}</p>`);
            note.status = emailResult.success ? 'sent' : 'failed';
            note.sentAt = new Date().toISOString();
            note.deliveryInfo = emailResult;
          } catch (error) {
            note.status = 'failed';
            note.sentAt = new Date().toISOString();
            note.deliveryInfo = { success: false, error: error.message };
          }
        }

        if (parent.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          try {
            const smsResult = await sendSmsNotification(parent.phone, message);
            const sms = {
              id: createId('notification'),
              toUserId: parent.id,
              toPhone: parent.phone,
              childId: student.id,
              level: al.level,
              message,
              channel: 'sms',
              status: smsResult.success ? 'sent' : 'failed',
              createdAt: new Date().toISOString(),
              sentAt: new Date().toISOString(),
              deliveryInfo: smsResult
            };
            data.notifications.push(sms);
            notifications.push(sms);
          } catch (error) {
            data.notifications.push({
              id: createId('notification'),
              toUserId: parent.id,
              toPhone: parent.phone,
              childId: student.id,
              level: al.level,
              message,
              channel: 'sms',
              status: 'failed',
              createdAt: new Date().toISOString(),
              sentAt: new Date().toISOString(),
              deliveryInfo: { success: false, error: error.message }
            });
          }
        }
      }
    }
  }

  writeData(data);

  console.log(`Alerts run completed — created ${notifications.length} notifications`);

  return res.json({ created: notifications.length, notifications });
}

export function listNotifications(req, res) {
  const data = readData();
  const requestedUserId = req.query.userId ? String(req.query.userId) : null;

  if (req.user.role !== 'admin' && requestedUserId && requestedUserId !== req.user.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const userId = req.user.role === 'admin' ? requestedUserId : req.user.id;
  let list = data.notifications || [];
  if (userId) list = list.filter((n) => n.toUserId === userId);
  return res.json({ notifications: list.slice().reverse() });
}
