import { pool } from '../config/database.js';
import { roles } from '../models/User.js';
import { findAllUsers } from '../repositories/UserRepository.js';

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    createdAt: row.created_at
  };
}

export async function listUsers(req, res) {
  try {
    const users = await findAllUsers();
    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo usuarios desde PostgreSQL' });
  }
}

export function listRoles(req, res) {
  return res.json([
    { value: 'student', label: 'Estudiante' },
    { value: 'instructor', label: 'Docente' },
    { value: 'admin', label: 'Administrador' },
    { value: 'parent', label: 'Padre de familia' }
  ]);
}

export async function createParentRelation(req, res) {
  try {
    const { parentId, childId } = req.body;
    const users = await pool.query(
      `SELECT id, role FROM users WHERE id = ANY($1::uuid[])`,
      [[parentId, childId]]
    );
    const parent = users.rows.find((u) => u.id === parentId);
    const child = users.rows.find((u) => u.id === childId);

    if (!parent || parent.role !== 'parent') {
      return res.status(400).json({ message: 'Padre inválido' });
    }
    if (!child || child.role !== 'student') {
      return res.status(400).json({ message: 'Estudiante inválido' });
    }

    const result = await pool.query(`
      INSERT INTO parent_relations (parent_id, child_id)
      VALUES ($1, $2)
      ON CONFLICT (parent_id, child_id) DO NOTHING
      RETURNING id, parent_id AS "parentId", child_id AS "childId", created_at AS "createdAt"
    `, [parentId, childId]);

    if (!result.rowCount) return res.status(409).json({ message: 'Relación ya existe' });
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creando relación familiar' });
  }
}

export async function deleteParentRelation(req, res) {
  try {
    const result = await pool.query(
      'DELETE FROM parent_relations WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Relación no encontrada' });
    return res.json({ message: 'Eliminado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error eliminando relación familiar' });
  }
}

export async function updateRole(req, res) {
  try {
    const { role } = req.body;
    if (!roles.includes(role)) return res.status(400).json({ message: 'Rol inválido' });

    const result = await pool.query(`
      UPDATE users
      SET role=$1, updated_at=NOW()
      WHERE id=$2
      RETURNING id, first_name, last_name, email, role, total_xp, current_level, created_at
    `, [role, req.params.id]);

    if (!result.rowCount) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(publicUser(result.rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error actualizando rol' });
  }
}
