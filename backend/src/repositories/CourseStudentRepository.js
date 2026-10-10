import { pool } from "../config/database.js";


const CourseStudentRepository = {


    async findAll() {

        const result = await pool.query(
            `
            SELECT
                id,
                course_id,
                student_id,
                status,
                enrolled_at
            FROM course_students
            ORDER BY enrolled_at DESC
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
                status,
                enrolled_at
            FROM course_students
            WHERE course_id = $1
            `,
            [course_id]
        );

        return result.rows;
    },



    async findByStudent(student_id) {

        const result = await pool.query(
            `
            SELECT
                id,
                course_id,
                student_id,
                status,
                enrolled_at
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
            status = "active"
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
            RETURNING *
            `,
            [
                course_id,
                student_id,
                status
            ]
        );


        return result.rows[0];
    }



};


export default CourseStudentRepository;
