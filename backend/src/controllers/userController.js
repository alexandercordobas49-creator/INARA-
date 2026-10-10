import { pool } from '../config/database.js';
import { roles } from '../models/User.js';
import { findAllUsers } from '../repositories/UserRepository.js';
import FamilyRepository from '../repositories/FamilyRepository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listUsers(req, res) {
  try {
    const users = await findAllUsers();
    return res.json(users.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      totalXp: user.total_xp,
      currentLevel: user.current_level
    })));
  } catch (error) {
    console.error('Unable to list users:', error.message);
    return res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
}

export async function listAccessibleStudents(req, res) {
  const queries = {
    admin: {
      sql: `
        SELECT id, first_name, last_name, role, total_xp, current_level
        FROM users
        WHERE role = 'student'
        ORDER BY last_name, first_name
      `,
      params: []
    },
    instructor: {
      sql: `
        SELECT DISTINCT u.id, u.first_name, u.last_name, u.role,
          NULL::integer AS total_xp, NULL::integer AS current_level
        FROM users u
        JOIN course_students cs ON cs.student_id = u.id AND cs.status = 'active'
        JOIN courses c ON c.id = cs.course_id
        WHERE u.role = 'student' AND c.instructor_id = $1
        ORDER BY u.last_name, u.first_name
      `,
      params: [req.user.id]
    },
    parent: {
      sql: `
        SELECT u.id, u.first_name, u.last_name, u.role, u.total_xp, u.current_level
        FROM parent_student_relations r
        JOIN users u ON u.id = r.student_id
        WHERE r.parent_id = $1 AND u.role = 'student'
        ORDER BY u.last_name, u.first_name
      `,
      params: [req.user.id]
    },
    student: {
      sql: `
        SELECT id, first_name, last_name, role, total_xp, current_level
        FROM users
        WHERE id = $1 AND role = 'student'
      `,
      params: [req.user.id]
    }
  }[req.user.role];

  if (!queries) return res.status(403).json({ message: 'No autorizado' });

  try {
    const result = await pool.query(queries.sql, queries.params);
    return res.json(result.rows.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      totalXp: user.total_xp,
      currentLevel: user.current_level
    })));
  } catch (error) {
    console.error('Unable to list accessible students:', error.message);
    return res.status(500).json({ message: 'Error obteniendo estudiantes autorizados' });
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
  const { parentId, childId } = req.body || {};
  if (typeof parentId !== 'string' || typeof childId !== 'string' ||
      !UUID_PATTERN.test(parentId) || !UUID_PATTERN.test(childId) || parentId === childId) {
    return res.status(400).json({ message: 'Identificadores de familiar o estudiante inválidos' });
  }

  try {
    const result = await FamilyRepository.createRelation(parentId, childId);
    if (result.error === 'invalid-users') {
      return res.status(400).json({ message: 'Familiar o estudiante inválido' });
    }
    if (result.error === 'duplicate') {
      return res.status(409).json({ message: 'La relación ya existe' });
    }
    return res.status(201).json(result.relation);
  } catch (error) {
    console.error('Unable to create family relation:', error.message);
    return res.status(500).json({ message: 'Error creando la relación familiar' });
  }
}

export async function deleteParentRelation(req, res) {
  if (!UUID_PATTERN.test(req.params.id)) {
    return res.status(400).json({ message: 'Identificador de relación inválido' });
  }

  try {
    const relation = await FamilyRepository.deleteRelation(req.params.id);
    if (!relation) {
      return res.status(404).json({ message: 'Relación no encontrada' });
    }
    return res.json({ message: 'Relación eliminada' });
  } catch (error) {
    console.error('Unable to delete family relation:', error.message);
    return res.status(500).json({ message: 'Error eliminando la relación familiar' });
  }
}

export async function updateRole(req, res) {
  const { id } = req.params;
  const { role } = req.body || {};

  if (typeof id !== 'string' || !UUID_PATTERN.test(id) || !roles.includes(role)) {
    return res.status(400).json({ message: 'Identificador o rol inválido' });
  }
  const normalizedId = id.toLowerCase();
  if (req.user.id.toLowerCase() === normalizedId) {
    return res.status(403).json({ message: 'No puedes cambiar tu propio rol' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('inara-user-role-change'))");

    const current = await client.query(
      'SELECT id, role FROM users WHERE id = $1 FOR UPDATE',
      [normalizedId]
    );
    const user = current.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (user.role === 'admin' && role !== 'admin') {
      const admins = await client.query(
        "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'"
      );
      if (admins.rows[0].count <= 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'No se puede quitar el último administrador' });
      }
    }

    const updated = await client.query(
      `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, first_name, last_name, email, role, total_xp, current_level
      `,
      [role, normalizedId]
    );
    await client.query('COMMIT');
    return res.json(updated.rows[0]);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Unable to rollback role update:', rollbackError.message);
    }
    console.error('Unable to update user role:', error.message);
    return res.status(500).json({ message: 'Error actualizando el rol del usuario' });
  } finally {
    client.release();
  }
}
