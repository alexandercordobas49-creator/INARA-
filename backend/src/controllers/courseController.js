import { courseStatuses } from '../models/Course.js';
import CourseRepository from '../repositories/CourseRepository.js';
import { pool } from '../config/database.js';


export async function listCourses(req, res) {

  try {

    let courses;
    if (req.user.role === 'admin') {
      courses = await CourseRepository.findAll();
    } else if (req.user.role === 'instructor') {
      const result = await pool.query(
        `
          SELECT id, name, instructor_id, status, created_at
          FROM courses
          WHERE instructor_id = $1
          ORDER BY created_at DESC
        `,
        [req.user.id]
      );
      courses = result.rows;
    } else if (req.user.role === 'student') {
      const result = await pool.query(
        `
          SELECT c.id, c.name, c.instructor_id, c.status, c.created_at
          FROM course_students cs
          JOIN courses c ON c.id = cs.course_id
          WHERE cs.student_id = $1 AND cs.status = 'active'
          ORDER BY c.created_at DESC
        `,
        [req.user.id]
      );
      courses = result.rows;
    } else if (req.user.role === 'parent') {
      const result = await pool.query(
        `
          SELECT DISTINCT c.id, c.name, c.instructor_id, c.status, c.created_at
          FROM parent_student_relations r
          JOIN course_students cs ON cs.student_id = r.student_id AND cs.status = 'active'
          JOIN courses c ON c.id = cs.course_id
          WHERE r.parent_id = $1
          ORDER BY c.created_at DESC
        `,
        [req.user.id]
      );
      courses = result.rows;
    } else {
      return res.status(403).json({ message: 'No autorizado' });
    }

    return res.json(courses);


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: 'Error obteniendo cursos'
    });

  }

}



export async function createCourse(req, res) {

  try {

    const {
      name,
      instructor_id,
      status = 'active'
    } = req.body;



    if (typeof name !== 'string' || !name.trim() || name.trim().length > 160 || !instructor_id) {

      return res.status(400).json({
        message: 'Nombre e instructor son requeridos'
      });

    }



    if (!courseStatuses.includes(status)) {

      return res.status(400).json({
        message: 'Estado de curso invalido'
      });

    }

    const instructor = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'instructor'",
      [instructor_id]
    );
    if (!instructor.rows.length) {
      return res.status(400).json({ message: 'Docente inválido' });
    }


    const course = await CourseRepository.create({
      name: name.trim(),
      instructor_id,
      status
    });



    return res.status(201).json(course);



  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: 'Error creando curso'
    });

  }

}