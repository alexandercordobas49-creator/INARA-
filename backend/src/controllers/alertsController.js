import { pool } from '../config/database.js';
import { sendEmailNotification, sendSmsNotification } from '../lib/notificationService.js';

async function studentRiskRows() {
  const result = await pool.query(`
    SELECT DISTINCT ON (sr.student_id)
      sr.student_id AS id, u.first_name, u.last_name, sr.id AS risk_id,
      sr.level, sr.risk_score, sr.main_reason
    FROM student_risk sr
    JOIN users u ON u.id=sr.student_id
    WHERE sr.level IN ('high', 'critical')
    ORDER BY sr.student_id, sr.created_at DESC
  `);
  return result.rows;
}

export async function runAlerts(req, res) {
  try {
    const students = await studentRiskRows();
    const notifications = [];

    for (const student of students) {
      const alert = {
        level: student.level,
        message: `Estudiante requiere seguimiento: ${student.main_reason || 'señales académicas combinadas'} (${student.risk_score}/100).`
      };

      const relations = await pool.query(`
        SELECT DISTINCT recipient.id, recipient.email, recipient.phone, recipient.first_name
        FROM (
          SELECT p.id, p.email, p.phone, p.first_name
          FROM parent_relations pr JOIN users p ON p.id=pr.parent_id
          WHERE pr.child_id=$1
          UNION
          SELECT u.id, u.email, u.phone, u.first_name
          FROM course_students cs JOIN courses c ON c.id=cs.course_id
          JOIN users u ON u.id=c.instructor_id
          WHERE cs.student_id=$1 AND cs.enrollment_status='active'
        ) recipient
      `, [student.id]);

      for (const parent of relations.rows) {
          const message = `Alerta INARA para ${student.first_name} ${student.last_name}: ${alert.message}`;

          // Avoid creating the same alert repeatedly when an administrator
          // runs the detector more than once on the same day.
          const duplicate = await pool.query(`
            SELECT id
            FROM notifications
            WHERE to_user_id=$1
              AND child_id=$2
              AND level=$3
              AND message=$4
              AND created_at >= CURRENT_DATE
            LIMIT 1
          `, [parent.id, student.id, alert.level, message]);

          if (duplicate.rowCount) continue;

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

    return res.json({ created: notifications.length, notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error ejecutando alertas' });
  }
}

export async function listNotifications(req, res) {
  try {
    const requestedUserId = req.query.userId;
    const requester = req.user;

    // Notifications contain family/student information. A normal user may
    // only read their own notifications; only administrators may query all
    // notifications or another user's notifications.
    if (requestedUserId && requestedUserId !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const effectiveUserId = requester.role === 'admin' ? requestedUserId : requester.id;
    const params = effectiveUserId ? [effectiveUserId] : [];

    const result = await pool.query(`
      SELECT id, to_user_id AS "toUserId", child_id AS "childId",
             to_email AS "toEmail", to_phone AS "toPhone", level, message,
             channel, status, is_read AS "isRead", delivery_info AS "deliveryInfo",
             created_at AS "createdAt", sent_at AS "sentAt"
      FROM notifications
      ${effectiveUserId ? 'WHERE to_user_id=$1' : ''}
      ORDER BY created_at DESC
    `, params);

    return res.json({ notifications: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo notificaciones' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const result = await pool.query(`
      UPDATE notifications
      SET is_read=TRUE
      WHERE id=$1 AND (to_user_id=$2 OR $3='admin')
      RETURNING id, is_read AS "isRead"
    `, [req.params.notificationId, req.user.id, req.user.role]);
    if (!result.rowCount) return res.status(404).json({ message: 'Notificación no encontrada.' });
    return res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error actualizando notificación.' });
  }
}
