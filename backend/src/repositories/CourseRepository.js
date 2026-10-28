import { pool } from "../config/database.js";


const CourseRepository = {


    async findAll() {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                instructor_id,
                status,
                created_at
            FROM courses
            ORDER BY created_at DESC
            `
        );

        return result.rows;
    },

    async findVisibleTo(user) {
        let query;
        let params = [];

        if (user.role === "admin") {
            query = `
                SELECT id, name, instructor_id, status, created_at
                FROM courses
                ORDER BY created_at DESC
            `;
        } else if (user.role === "instructor") {
            query = `
                SELECT id, name, instructor_id, status, created_at
                FROM courses
                WHERE instructor_id = $1
                ORDER BY created_at DESC
            `;
            params = [user.id];
        } else if (user.role === "student") {
            query = `
                SELECT c.id, c.name, c.instructor_id, c.status, c.created_at
                FROM courses c
                JOIN course_students cs ON cs.course_id = c.id
                WHERE cs.student_id = $1 AND cs.enrollment_status = 'active'
                ORDER BY c.created_at DESC
            `;
            params = [user.id];
        } else if (user.role === "parent") {
            query = `
                SELECT DISTINCT c.id, c.name, c.instructor_id, c.status, c.created_at
                FROM courses c
                JOIN course_students cs ON cs.course_id = c.id
                JOIN parent_relations pr ON pr.child_id = cs.student_id
                WHERE pr.parent_id = $1 AND cs.enrollment_status = 'active'
                ORDER BY c.created_at DESC
            `;
            params = [user.id];
        } else {
            return [];
        }

        const result = await pool.query(query, params);
        return result.rows;
    },


    async findById(id) {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                instructor_id,
                status,
                created_at
            FROM courses
            WHERE id = $1
            `,
            [id]
        );


        return result.rows[0];
    },


    async create(course) {

        const {
            name,
            instructor_id,
            status = "active"
        } = course;


        const result = await pool.query(
            `
            INSERT INTO courses
            (
                name,
                instructor_id,
                status
            )
            VALUES ($1,$2,$3)
            RETURNING *
            `,
            [
                name,
                instructor_id,
                status
            ]
        );


        return result.rows[0];
    },


    async update(id, course) {

        const {
            name,
            instructor_id,
            status
        } = course;


        const result = await pool.query(
            `
            UPDATE courses
            SET
                name=$1,
                instructor_id=$2,
                status=$3
            WHERE id=$4
            RETURNING *
            `,
            [
                name,
                instructor_id,
                status,
                id
            ]
        );


        return result.rows[0];
    },


    async delete(id) {

        await pool.query(
            `
            DELETE FROM courses
            WHERE id=$1
            `,
            [id]
        );


        return true;
    }


};


export default CourseRepository;
