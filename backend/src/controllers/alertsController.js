import { pool } from '../config/database.js';
import { sendEmailNotification, sendSmsNotification } from '../lib/notificationService.js';

function detectAlerts(student) {
  const alerts = [];
  if (student.absent_count >= 3) {
    alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
  }
  if ((student.current_streak || 0) <= 1) {
    alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
  }
  if ((student.total_xp || 0) < 200) {
    alerts.push({ level: 'low', message: 'Progreso bajo en XP' });
  }
  return alerts;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export async function runAlerts(req, res) {
  const client = await pool.connect();
  const created = [];

  try {
    const studentsResult = await client.query(
      `
        WITH attendance_summary AS (
          SELECT
            user_id,
            COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_count
          FROM attendance_records
          GROUP BY user_id
        ),
        streak_summary AS (
          SELECT user_id, COALESCE(MAX(current_count), 0)::int AS current_streak
          FROM streaks
          GROUP BY user_id
        )
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.total_xp,
          COALESCE(a.absent_count, 0)::int AS absent_count,
          COALESCE(s.current_streak, 0)::int AS current_streak
        FROM users u
        LEFT JOIN attendance_summary a ON a.user_id = u.id
        LEFT JOIN streak_summary s ON s.user_id = u.id
        WHERE u.role = 'student'
      `
    );

    for (const student of studentsResult.rows) {
      const alerts = detectAlerts(student);
      if (!alerts.length) continue;

      const parentsResult = await client.query(
        `
          SELECT p.id, p.email, p.phone
          FROM parent_student_relations r
          JOIN users p ON p.id = r.parent_id AND p.role = 'parent'
          WHERE r.student_id = $1
        `,
        [student.id]
      );

      for (const parent of parentsResult.rows) {
        for (const alert of alerts) {
          const message = `Alerta para ${student.first_name} ${student.last_name}: ${alert.message}`;
          const emailEnabled = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
          const smsEnabled = Boolean(parent.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
          const channels = [
            ...(emailEnabled ? ['email'] : []),
            ...(smsEnabled ? ['sms'] : [])
          ];

          for (const channel of channels) {
            const saved = await client.query(
              `
                INSERT INTO notifications
                  (to_user_id, student_id, alert_level, message, channel, status)
                VALUES ($1, $2, $3, $4, $5, 'pending')
                ON CONFLICT (to_user_id, student_id, alert_level, channel, dedupe_date)
                DO NOTHING
                RETURNING id
              `,
              [parent.id, student.id, alert.level, message, channel]
            );
            if (!saved.rows.length) continue;

            let delivery;
            try {
              delivery = channel === 'email'
                ? await sendEmailNotification(
                    parent.email,
                    `Alerta INARA: ${student.first_name}`,
                    `<p>${escapeHtml(message)}</p>`
                  )
                : await sendSmsNotification(parent.phone, message);
            } catch (error) {
              console.error(`Alert ${channel} delivery failed:`, error.message);
              delivery = { success: false, error: 'delivery_failed' };
            }

            const status = delivery?.success ? 'sent' : 'failed';
            await client.query(
              `
                UPDATE notifications
                SET status = $1, sent_at = NOW(), delivery_info = $2::jsonb
                WHERE id = $3
              `,
              [status, JSON.stringify({ success: Boolean(delivery?.success) }), saved.rows[0].id]
            );
            created.push({ id: saved.rows[0].id, level: alert.level, channel, status });
          }
        }
      }
    }

    return res.json({ created: created.length, notifications: created });
  } catch (error) {
    console.error('Unable to run student alerts:', error.message);
    return res.status(500).json({ message: 'Error procesando las alertas' });
  } finally {
    client.release();
  }
}

export async function listNotifications(req, res) {
  try {
    const requestedUserId = req.query.userId ? String(req.query.userId) : req.user.id;
    if (req.user.role !== 'admin' && requestedUserId !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'parent') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      `
        SELECT id, student_id, alert_level, message, channel, status, created_at, sent_at
        FROM notifications
        WHERE to_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [requestedUserId]
    );
    return res.json({
      notifications: result.rows.map((row) => ({
        id: row.id,
        childId: row.student_id,
        level: row.alert_level,
        message: row.message,
        channel: row.channel,
        status: row.status,
        createdAt: row.created_at,
        sentAt: row.sent_at
      }))
    });
  } catch (error) {
    console.error('Unable to list notifications:', error.message);
    return res.status(500).json({ message: 'Error obteniendo notificaciones' });
  }
}
