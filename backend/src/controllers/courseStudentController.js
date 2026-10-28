import CourseStudentRepository from "../repositories/CourseStudentRepository.js";
import { pool } from '../config/database.js';
import { canAccessCourse, canAccessStudent } from '../middleware/accessControl.js';


export async function listCourseStudents(req, res) {

    try {

        const data = req.user.role === 'admin'
            ? await CourseStudentRepository.findAll()
            : await CourseStudentRepository.findByInstructor(req.user.id);

        return res.json(data);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo matrículas"
        });

    }

}



export async function listStudentsByCourse(req, res) {

    try {
        if (!(await canAccessCourse(req.user, req.params.id))) {
            return res.status(403).json({ message: "No autorizado" });
        }

        const data = await CourseStudentRepository.findByCourse(
            req.params.id
        );

        return res.json(data);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo estudiantes del curso"
        });

    }

}



export async function listCoursesByStudent(req, res) {

    try {
        const studentId = req.params.id;
        if (!(await canAccessStudent(req.user, studentId))) {
            return res.status(403).json({ message: "No autorizado" });
        }

        const data = req.user.role === 'instructor'
            ? await CourseStudentRepository.findByStudentAndInstructor(studentId, req.user.id)
            : await CourseStudentRepository.findByStudent(studentId);

        return res.json(data);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo cursos del estudiante"
        });

    }

}



export async function createCourseStudent(req, res) {

    try {

        const {
            course_id,
            student_id,
            status = "active"
        } = req.body;


        if (!course_id || !student_id) {

            return res.status(400).json({
                message: "Curso y estudiante son requeridos"
            });

        }

        if (!['active', 'completed', 'withdrawn', 'suspended'].includes(status)) {
            return res.status(400).json({ message: "Estado de matrícula inválido" });
        }

        if (!(await canAccessCourse(req.user, course_id))) {
            return res.status(403).json({ message: "No autorizado para ese curso" });
        }

        const student = await pool.query(
            "SELECT id FROM users WHERE id=$1 AND role='student'",
            [student_id]
        );
        if (!student.rowCount) {
            return res.status(404).json({ message: "Estudiante no encontrado" });
        }

        const enrollment =
            await CourseStudentRepository.create({
                course_id,
                student_id,
                enrollment_status: status
            });


        return res.status(201).json(enrollment);


    } catch (error) {

        console.error(error);

        if (error.code === '23505') {
            return res.status(409).json({ message: "El estudiante ya está matriculado en este curso" });
        }

        return res.status(500).json({
            message: "Error creando matrícula"
        });

    }

}