import { pool } from "../config/database.js";


const CourseStudentRepository = {


    async findAll() {

        const result = await pool.query(
            `
            SELECT
                id,
                course_id,
                student_id,
                status AS enrollment_status,
                enrolled_at AS created_at
            FROM course_students
            ORDER BY created_at DESC
            `
        );

        return result.rows;
    },



    async findByCourse(course_id) {

        const result = await pool.query(
            `
            SELECT
                id,
                course_id,
                student_id,
                status AS enrollment_status,
                enrolled_at AS created_at
            FROM course_students
            WHERE course_id = $1
            `,
            [course_id]
        );

        return result.rows;
    },

    async findByInstructor(instructorId) {
        const result = await pool.query(`
            SELECT cs.id, cs.course_id, cs.student_id, cs.status AS enrollment_status, cs.enrolled_at AS created_at
            FROM course_students cs
            JOIN courses c ON c.id = cs.course_id
            WHERE c.instructor_id = $1
            ORDER BY cs.enrolled_at DESC
        `, [instructorId]);
        return result.rows;
    },

    async findByStudentAndInstructor(studentId, instructorId) {
        const result = await pool.query(`
            SELECT cs.id, cs.course_id, cs.student_id, cs.status AS enrollment_status, cs.enrolled_at AS created_at
            FROM course_students cs
            JOIN courses c ON c.id = cs.course_id
            WHERE cs.student_id = $1 AND c.instructor_id = $2
            ORDER BY cs.enrolled_at DESC
        `, [studentId, instructorId]);
        return result.rows;
    },



    async findByStudent(student_id) {

        const result = await pool.query(
            `
            SELECT
                id,
                course_id,
                student_id,
                status AS enrollment_status,
                enrolled_at AS created_at
            FROM course_students
            WHERE student_id = $1
            `,
            [student_id]
        );

        return result.rows;
    },



    async create(data) {

        const {
            course_id,
            student_id,
            enrollment_status = "active"
        } = data;


        const result = await pool.query(
            `
            INSERT INTO course_students
            (
                course_id,
                student_id,
                status
            )
            VALUES ($1,$2,$3)
            RETURNING id, course_id, student_id, status AS enrollment_status, enrolled_at AS created_at
            `,
            [
                course_id,
                student_id,
                enrollment_status
            ]
        );


        return result.rows[0];
    }



};


export default CourseStudentRepository;
