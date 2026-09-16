import { pool } from '../config/database.js';

async function isParentOf(parentId, childId) {
  const result = await pool.query(
    'SELECT 1 FROM parent_relations WHERE parent_id=$1 AND child_id=$2',
    [parentId, childId]
  );
  return result.rowCount > 0;
}

function mapRoute(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    missions: row.missions || [],
    createdAt: row.created_at
  };
}

function mapProgress(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    routeId: row.route_id,
    completedMissions: row.completed_missions || [],
    startedAt: row.started_at,
    updatedAt: row.updated_at
  };
}

export async function listRoutes(req, res) {
  try {
    const result = await pool.query('SELECT * FROM competency_routes ORDER BY created_at');
    return res.json({ routes: result.rows.map(mapRoute) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo rutas de competencias' });
  }
}

export async function getRoute(req, res) {
  try {
    const result = await pool.query('SELECT * FROM competency_routes WHERE id=$1', [req.params.routeId]);
    if (!result.rowCount) return res.status(404).json({ message: 'Ruta no encontrada' });
    return res.json(mapRoute(result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo ruta' });
  }
}

export async function getUserProgress(req, res) {
  try {
    const { userId } = req.params;
    const student = await pool.query('SELECT id FROM users WHERE id=$1', [userId]);
    if (!student.rowCount) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (req.user.role === 'student' && req.user.id !== userId) return res.status(403).json({ message: 'No autorizado' });
    if (req.user.role === 'parent' && !(await isParentOf(req.user.id, userId))) return res.status(403).json({ message: 'No autorizado' });

    const result = await pool.query(
      'SELECT * FROM user_competency_progress WHERE user_id=$1 ORDER BY updated_at DESC',
      [userId]
    );
    return res.json({ progress: result.rows.map(mapProgress) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo progreso' });
  }
}

export async function completeMission(req, res) {
  const client = await pool.connect();
  try {
    const { userId, routeId, missionId, evidence } = req.body;
    if (!userId || !routeId || !missionId) return res.status(400).json({ message: 'Usuario, ruta y misión son requeridos' });

    if (req.user.role === 'student' && req.user.id !== userId) return res.status(403).json({ message: 'No autorizado' });
    if (req.user.role === 'parent' && !(await isParentOf(req.user.id, userId))) return res.status(403).json({ message: 'No autorizado' });

    const routeResult = await client.query('SELECT * FROM competency_routes WHERE id=$1', [routeId]);
    const route = routeResult.rows[0];
    if (!route) return res.status(404).json({ message: 'Ruta no encontrada' });

    const mission = (route.missions || []).find((item) => item.id === missionId);
    if (!mission) return res.status(404).json({ message: 'Misión no encontrada' });

    await client.query('BEGIN');
    const progressResult = await client.query(`
      INSERT INTO user_competency_progress (user_id, route_id, completed_missions)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (user_id, route_id) DO UPDATE
      SET updated_at=NOW()
      RETURNING *
    `, [userId, routeId, JSON.stringify([])]);

    let progress = progressResult.rows[0];
    const completed = Array.isArray(progress.completed_missions) ? progress.completed_missions : [];
    if (!completed.includes(missionId)) completed.push(missionId);

    const updated = await client.query(`
      UPDATE user_competency_progress
      SET completed_missions=$1::jsonb, updated_at=NOW()
      WHERE id=$2
      RETURNING *
    `, [JSON.stringify(completed), progress.id]);
    progress = updated.rows[0];

    if (evidence) {
      await client.query(`
        INSERT INTO evidences (progress_id, mission_id, type, title, description, url)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [progress.id, missionId, evidence.type || 'document', evidence.title || mission.title, evidence.description || '', evidence.url || '']);
    }

    await client.query('COMMIT');
    return res.json({ progress: mapProgress(progress) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ message: 'Error completando misión' });
  } finally {
    client.release();
  }
}

export async function getRouteProgress(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM user_competency_progress WHERE user_id=$1 AND route_id=$2',
      [req.params.userId, req.params.routeId]
    );
    return res.json({ progress: mapProgress(result.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo progreso de ruta' });
  }
}
