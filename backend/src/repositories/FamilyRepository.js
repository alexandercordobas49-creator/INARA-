import { pool } from '../config/database.js';

const FamilyRepository = {
  async isParentOf(parentId, studentId, queryable = pool) {
    const result = await queryable.query(
      `
        SELECT 1
        FROM parent_student_relations
        WHERE parent_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [parentId, studentId]
    );

    return result.rows.length > 0;
  },

  async findChildren(parentId) {
    const result = await pool.query(
      `
        SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.total_xp, u.current_level
        FROM parent_student_relations r
        JOIN users u ON u.id = r.student_id
        WHERE r.parent_id = $1 AND u.role = 'student'
        ORDER BY u.last_name, u.first_name
      `,
      [parentId]
    );

    return result.rows;
  },

  async createRelation(parentId, studentId) {
    const normalizedParentId = parentId.toLowerCase();
    const normalizedStudentId = studentId.toLowerCase();
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const users = await client.query(
        `
          SELECT id, role
          FROM users
          WHERE id = ANY($1::uuid[])
          FOR SHARE
        `,
        [[normalizedParentId, normalizedStudentId]]
      );
      const parent = users.rows.find((user) => user.id === normalizedParentId);
      const student = users.rows.find((user) => user.id === normalizedStudentId);

      if (parent?.role !== 'parent' || student?.role !== 'student') {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return { error: 'invalid-users' };
      }

      const inserted = await client.query(
        `
          INSERT INTO parent_student_relations (parent_id, student_id)
          VALUES ($1, $2)
          ON CONFLICT (parent_id, student_id) DO NOTHING
          RETURNING id, parent_id, student_id, created_at
        `,
        [normalizedParentId, normalizedStudentId]
      );

      if (!inserted.rows.length) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return { error: 'duplicate' };
      }

      await client.query('COMMIT');
      transactionOpen = false;
      return { relation: inserted.rows[0] };
    } catch (error) {
      if (transactionOpen) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Unable to rollback family relation transaction:', rollbackError.message);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteRelation(id) {
    const result = await pool.query(
      `
        DELETE FROM parent_student_relations
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    return result.rows[0];
  }
};

export default FamilyRepository;
