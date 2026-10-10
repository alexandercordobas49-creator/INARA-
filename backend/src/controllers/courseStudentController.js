import CourseStudentRepository from "../repositories/CourseStudentRepository.js";
import { pool } from "../config/database.js";
import FamilyRepository from '../repositories/FamilyRepository.js';

async function canAccessStudent(actor, targetUserId) {
    if (actor.role === 'admin') return true;
    if (actor.role === 'student') return actor.id === targetUserId;
    if (actor.role === 'parent') {
        return FamilyRepository.isParentOf(actor.id, targetUserId);
    }
    if (actor.role === 'instructor') {
        const assignment = await pool.query(
            `
              SELECT 1
              FROM course_students cs
              JOIN courses c ON c.id = cs.course_id
              WHERE cs.student_id = $1
                AND cs.status = 'active'
                AND c.instructor_id = $2
              LIMIT 1
            `,
            [targetUserId, actor.id]
        );
        return assignment.rows.length > 0;
    }
    return false;
}

export async function listCourseStudents(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const data = await CourseStudentRepository.findAll();
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
        if (req.user.role === 'admin') {
            const data = await CourseStudentRepository.findByCourse(req.params.id);
            return res.json(data);
        }

        if (req.user.role === 'instructor') {
            const courseCheck = await pool.query(
                'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
                [req.params.id, req.user.id]
            );

            if (!courseCheck.rows.length) {
                return res.status(403).json({ message: 'No autorizado' });
            }

            const data = await CourseStudentRepository.findByCourse(req.params.id);
            return res.json(data);
        }

        return res.status(403).json({ message: 'No autorizado' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error obteniendo estudiantes del curso"
        });
    }
}

export async function listCoursesByStudent(req, res) {
    try {
        const targetUserId = req.params.id;

        if (!(await canAccessStudent(req.user, targetUserId))) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const data = req.user.role === 'instructor'
            ? await CourseStudentRepository.findByStudentAndInstructor(targetUserId, req.user.id)
            : await CourseStudentRepository.findByStudent(targetUserId);
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
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            return res.status(403).json({ message: 'No autorizado' });
        }

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
            return res.status(400).json({ message: 'Estado de matrícula inválido' });
        }

        if (req.user.role === 'instructor') {
            const courseCheck = await pool.query(
                'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
                [course_id, req.user.id]
            );

            if (!courseCheck.rows.length) {
                return res.status(403).json({ message: 'No autorizado' });
            }
        }

        const studentCheck = await pool.query(
            "SELECT id FROM users WHERE id = $1 AND role = 'student'",
            [student_id]
        );

        if (!studentCheck.rows.length) {
            return res.status(400).json({ message: 'El usuario indicado no es un estudiante válido' });
        }

        let enrollment;
        try {
            enrollment = await CourseStudentRepository.create({
                course_id,
                student_id,
                status
            });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ message: 'El estudiante ya está matriculado en este curso' });
            }
            throw error;
        }

        return res.status(201).json(enrollment);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error creando matrícula"
        });
    }
}