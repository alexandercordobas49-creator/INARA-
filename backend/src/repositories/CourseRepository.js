import { pool } from "../config/database.js";


const CourseRepository = {


    async findAll() {

        const result = await pool.query(
            `
            SELECT
                c.id,
                c.name,
                c.instructor_id,
                c.status,
                c.created_at,
                CONCAT_WS(' ', instructor.first_name, instructor.last_name) AS instructor_name,
                COUNT(cs.student_id)::int AS student_count
            FROM courses c
            LEFT JOIN users instructor ON instructor.id = c.instructor_id
            LEFT JOIN course_students cs ON cs.course_id = c.id AND cs.status = 'active'
            GROUP BY c.id, instructor.first_name, instructor.last_name
            ORDER BY c.created_at DESC
            `
        );

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