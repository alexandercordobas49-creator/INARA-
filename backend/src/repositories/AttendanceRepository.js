import { pool } from "../config/database.js";

const AttendanceRepository = {

    async findAll() {

        const result = await pool.query(
            `
            SELECT
                ar.id,
                ar.user_id,
                ar.course_id,
                ar.session_date,
                ar.status,
                ar.notes,
                ar.recorded_at,
                u.first_name,
                u.last_name,
                u.email,
                c.name AS course_name
            FROM attendance_records ar
            JOIN users u ON u.id = ar.user_id
            JOIN courses c ON c.id = ar.course_id
            ORDER BY ar.session_date DESC
            `
        );

        return result.rows;
    },


    async findByStudent(userId) {

        const result = await pool.query(
            `
            SELECT
                ar.*,
                c.name AS course_name,
                u.first_name,
                u.last_name
            FROM attendance_records ar
            JOIN courses c
            ON c.id = ar.course_id
            JOIN users u ON u.id = ar.user_id
            WHERE ar.user_id = $1
            ORDER BY ar.session_date DESC
            `,
            [userId]
        );

        return result.rows;
    },

    async findByStudentAndInstructor(userId, instructorId) {
        const result = await pool.query(
            `
            SELECT
                ar.*,
                c.name AS course_name
            FROM attendance_records ar
            JOIN courses c ON c.id = ar.course_id
            JOIN course_students cs
              ON cs.course_id = ar.course_id
             AND cs.student_id = ar.user_id
             AND cs.status = 'active'
            WHERE ar.user_id = $1
              AND c.instructor_id = $2
            ORDER BY ar.session_date DESC
            `,
            [userId, instructorId]
        );

        return result.rows;
    },


    async findOne(userId, courseId, sessionDate) {

        const result = await pool.query(
            `
            SELECT *
            FROM attendance_records
            WHERE user_id=$1
            AND course_id=$2
            AND session_date=$3
            `,
            [
                userId,
                courseId,
                sessionDate
            ]
        );

        return result.rows[0];
    },


    async create(data) {

        const {
            userId,
            courseId,
            sessionDate,
            status,
            notes
        } = data;


        const result = await pool.query(
            `
            INSERT INTO attendance_records
            (
                user_id,
                course_id,
                session_date,
                status,
                notes
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [
                userId,
                courseId,
                sessionDate,
                status,
                notes
            ]
        );


        return result.rows[0];
    },


    async update(id, status, notes) {

        const result = await pool.query(
            `
            UPDATE attendance_records
            SET
                status=$1,
                notes=$2,
                recorded_at=NOW()
            WHERE id=$3
            RETURNING *
            `,
            [
                status,
                notes,
                id
            ]
        );


        return result.rows[0];
    }

};


export default AttendanceRepository;