import CourseStudentRepository from "../repositories/CourseStudentRepository.js";
import { pool } from "../config/database.js";
import { readData, isParentOf } from '../data/store.js';

function canAccessStudent(actor, targetUserId) {
    if (actor.role === 'admin') return true;
    if (actor.role === 'student') return actor.id === targetUserId;
    if (actor.role === 'parent') {
        const data = readData();
        return isParentOf(data, actor.id, targetUserId);
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

        if (!canAccessStudent(req.user, targetUserId)) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const data = await CourseStudentRepository.findByStudent(targetUserId);
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

        const enrollment = await CourseStudentRepository.create({
            course_id,
            student_id,
            status
        });

        return res.status(201).json(enrollment);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error creando matrícula"
        });
    }
}