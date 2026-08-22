import { pool } from '../config/database.js';
import { sendEmailNotification, sendSmsNotification } from '../lib/notificationService.js';

function detectAlerts(student) {
  const alerts = [];
  if (student.absent >= 3) alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
  if ((student.currentCount || 0) <= 1) alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
  if ((student.total_xp || 0) < 200) alerts.push({ level: 'low', message: 'Progreso bajo en XP' });
  return alerts;
}

async function studentRiskRows() {
  const result = await pool.query(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.total_xp,
      COALESCE(a.absent, 0)::int AS absent,
      COALESCE(s.current_count, 0)::int AS "currentCount"
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) FILTER (WHERE status='absent') AS absent
      FROM attendance_records GROUP BY user_id
    ) a ON a.user_id=u.id
    LEFT JOIN (
      SELECT user_id, MAX(current_count) AS current_count
      FROM streaks GROUP BY user_id
    ) s ON s.user_id=u.id
    WHERE u.role='student'
  `);
  return result.rows;
}

export async function runAlerts(req, res) {
  try {
    const students = await studentRiskRows();
    const notifications = [];

    for (const student of students) {
      const alerts = detectAlerts(student);
      if (!alerts.length) continue;

      const relations = await pool.query(`
        SELECT p.id, p.email, p.phone, p.first_name
        FROM parent_relations pr
        JOIN users p ON p.id=pr.parent_id
        WHERE pr.child_id=$1
      `, [student.id]);

      for (const parent of relations.rows) {
        for (const alert of alerts) {
          const message = `Alerta para ${student.first_name} ${student.last_name}: ${alert.message}`;
          const noteResult = await pool.query(`
            INSERT INTO notifications
              (to_user_id, child_id, to_email, to_phone, level, message, channel, status)
            VALUES ($1,$2,$3,$4,$5,$6,'email','pending')
            RETURNING id, to_user_id AS "toUserId", child_id AS "childId",
                      to_email AS "toEmail", to_phone AS "toPhone", level, message,
                      channel, status, created_at AS "createdAt"
          `, [parent.id, student.id, parent.email, parent.phone || null, alert.level, message]);

          const note = noteResult.rows[0];
          notifications.push(note);

          if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
              const emailResult = await sendEmailNotification(parent.email, `Alerta INARA: ${student.first_name}`, `<p>${message}</p>`);
              await pool.query(`
                UPDATE notifications
                SET status=$1, sent_at=NOW(), delivery_info=$2::jsonb
                WHERE id=$3
              `, [emailResult.success ? 'sent' : 'failed', JSON.stringify(emailResult), note.id]);
              note.status = emailResult.success ? 'sent' : 'failed';
            } catch (error) {
              const delivery = { success: false, error: error.message };
              await pool.query(`
                UPDATE notifications
                SET status='failed', sent_at=NOW(), delivery_info=$1::jsonb
                WHERE id=$2
              `, [JSON.stringify(delivery), note.id]);
              note.status = 'failed';
            }
          }

          if (parent.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
              const smsResult = await sendSmsNotification(parent.phone, message);
              const sms = await pool.query(`
                INSERT INTO notifications
                  (to_user_id, child_id, to_phone, level, message, channel, status, sent_at, delivery_info)
                VALUES ($1,$2,$3,$4,$5,'sms',$6,NOW(),$7::jsonb)
                RETURNING id, to_user_id AS "toUserId", child_id AS "childId",
                          to_phone AS "toPhone", level, message, channel, status,
                          created_at AS "createdAt", sent_at AS "sentAt"
              `, [parent.id, student.id, parent.phone, alert.level, message, smsResult.success ? 'sent' : 'failed', JSON.stringify(smsResult)]);
              notifications.push(sms.rows[0]);
            } catch (error) {
              const delivery = { success: false, error: error.message };
              await pool.query(`
                INSERT INTO notifications
                  (to_user_id, child_id, to_phone, level, message, channel, status, sent_at, delivery_info)
                VALUES ($1,$2,$3,$4,$5,'sms','failed',NOW(),$6::jsonb)
              `, [parent.id, student.id, parent.phone, alert.level, message, JSON.stringify(delivery)]);
            }
          }
        }
      }
    }

    return res.json({ created: notifications.length, notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error ejecutando alertas' });
  }
}

export async function listNotifications(req, res) {
  try {
    const { userId } = req.query;
    const params = userId ? [userId] : [];
    const result = await pool.query(`
      SELECT id, to_user_id AS "toUserId", child_id AS "childId",
             to_email AS "toEmail", to_phone AS "toPhone", level, message,
             channel, status, delivery_info AS "deliveryInfo",
             created_at AS "createdAt", sent_at AS "sentAt"
      FROM notifications
      ${userId ? 'WHERE to_user_id=$1' : ''}
      ORDER BY created_at DESC
    `, params);
    return res.json({ notifications: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo notificaciones' });
  }
}
