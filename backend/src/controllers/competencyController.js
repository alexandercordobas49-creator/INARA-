import { pool } from '../config/database.js';
import FamilyRepository from '../repositories/FamilyRepository.js';

async function canAccessUser(actor, targetUserId) {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'student') return actor.id === targetUserId;
  if (actor.role === 'parent') {
    return FamilyRepository.isParentOf(actor.id, targetUserId);
  }
  return false;
}

export async function listRoutes(req, res) {
  try {
    const result = await pool.query(
      'SELECT route_id AS id, name, description, icon, missions FROM competency_routes ORDER BY name'
    );
    return res.json({ routes: result.rows });
  } catch (error) {
    console.error('Unable to list competency routes:', error.message);
    return res.status(500).json({ message: 'Error obteniendo rutas educativas' });
  }
}

export async function getRoute(req, res) {
  try {
    const result = await pool.query(
      'SELECT route_id AS id, name, description, icon, missions FROM competency_routes WHERE route_id = $1',
      [req.params.routeId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Ruta no encontrada' });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Unable to load competency route:', error.message);
    return res.status(500).json({ message: 'Error obteniendo la ruta educativa' });
  }
}

export async function getUserProgress(req, res) {
  try {
    const userId = req.params.userId;
    if (!(await canAccessUser(req.user, userId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      `
        SELECT p.id, p.user_id, p.route_id, p.completed_missions, p.started_at, p.updated_at
        FROM user_competency_progress p
        WHERE p.user_id = $1
        ORDER BY p.updated_at DESC
      `,
      [userId]
    );
    return res.json({ progress: result.rows });
  } catch (error) {
    console.error('Unable to load competency progress:', error.message);
    return res.status(500).json({ message: 'Error obteniendo el progreso educativo' });
  }
}

export async function completeMission(req, res) {
  const { userId, routeId, missionId, evidence } = req.body || {};
  if (!userId || typeof routeId !== 'string' || typeof missionId !== 'string') {
    return res.status(400).json({ message: 'Estudiante, ruta y misión son requeridos' });
  }
  if (!(await canAccessUser(req.user, userId))) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  if (evidence && (
    typeof evidence !== 'object' ||
    typeof evidence.type !== 'string' ||
    typeof evidence.title !== 'string' ||
    evidence.title.trim().length < 1 ||
    evidence.title.length > 160 ||
    typeof (evidence.description || '') !== 'string' ||
    (evidence.description || '').length > 2000 ||
    typeof (evidence.url || '') !== 'string' ||
    (evidence.url || '').length > 2048
  )) {
    return res.status(400).json({ message: 'La evidencia no tiene un formato válido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const [userResult, routeResult] = await Promise.all([
      client.query("SELECT id FROM users WHERE id = $1 AND role = 'student' FOR SHARE", [userId]),
      client.query('SELECT route_id, missions FROM competency_routes WHERE route_id = $1 FOR SHARE', [routeId])
    ]);
    if (!userResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    const route = routeResult.rows[0];
    if (!route) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ruta no encontrada' });
    }
    const mission = route.missions.find((item) => item.id === missionId);
    if (!mission) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Misión no encontrada' });
    }

    const progressResult = await client.query(
      `
        INSERT INTO user_competency_progress (user_id, route_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, route_id)
        DO UPDATE SET updated_at = NOW()
        RETURNING id, user_id, route_id, completed_missions, started_at, updated_at
      `,
      [userId, routeId]
    );
    const progress = progressResult.rows[0];
    const wasCompleted = progress.completed_missions.includes(missionId);
    if (!wasCompleted) {
      const updated = await client.query(
        `
          UPDATE user_competency_progress
          SET completed_missions = array_append(completed_missions, $1), updated_at = NOW()
          WHERE id = $2
          RETURNING id, user_id, route_id, completed_missions, started_at, updated_at
        `,
        [missionId, progress.id]
      );
      Object.assign(progress, updated.rows[0]);

      if (evidence) {
        const type = evidence.type.trim();
        if (!type || type.length > 40) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Tipo de evidencia inválido' });
        }
        await client.query(
          `
            INSERT INTO competency_evidence
              (progress_id, mission_id, evidence_type, title, description, url)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            progress.id,
            missionId,
            type,
            evidence.title.trim(),
            evidence.description || '',
            evidence.url || ''
          ]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({
      progress: {
        id: progress.id,
        userId: progress.user_id,
        routeId: progress.route_id,
        completedMissions: progress.completed_missions,
        startedAt: progress.started_at,
        updatedAt: progress.updated_at
      }
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Unable to rollback mission completion:', rollbackError.message);
    }
    console.error('Unable to complete competency mission:', error.message);
    return res.status(500).json({ message: 'Error guardando el avance de la misión' });
  } finally {
    client.release();
  }
}

export async function getRouteProgress(req, res) {
  try {
    const userId = req.params.userId;
    if (!(await canAccessUser(req.user, userId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const result = await pool.query(
      `
        SELECT id, user_id, route_id, completed_missions, started_at, updated_at
        FROM user_competency_progress
        WHERE user_id = $1 AND route_id = $2
      `,
      [userId, req.params.routeId]
    );
    return res.json({ progress: result.rows[0] || null });
  } catch (error) {
    console.error('Unable to load route progress:', error.message);
    return res.status(500).json({ message: 'Error obteniendo el progreso de la ruta' });
  }
}
