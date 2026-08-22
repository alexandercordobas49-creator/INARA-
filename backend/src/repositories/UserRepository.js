import { pool } from '../config/database.js';

export async function findAllUsers() {
  const result = await pool.query(`
    SELECT
      id,
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      role,
      total_xp AS "totalXp",
      current_level AS "currentLevel",
      created_at AS "createdAt"
    FROM users
    ORDER BY created_at DESC
  `);
  return result.rows;
}

export async function findUserById(id) {
  const result = await pool.query(`
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      total_xp,
      current_level,
      created_at
    FROM users
    WHERE id=$1
  `, [id]);
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query(`
    SELECT *
    FROM users
    WHERE email=$1
  `, [email]);
  return result.rows[0];
}

export async function createUser(user) {
  const { first_name, last_name, email, password_hash, role } = user;
  const result = await pool.query(`
    INSERT INTO users (first_name, last_name, email, password_hash, role)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `, [first_name, last_name, email, password_hash, role]);
  return result.rows[0];
}

export async function updatePasswordByEmail(email, password_hash) {
  const result = await pool.query(`
    UPDATE users
    SET password_hash=$1, updated_at=NOW()
    WHERE email=$2
    RETURNING *
  `, [password_hash, email]);
  return result.rows[0];
}
