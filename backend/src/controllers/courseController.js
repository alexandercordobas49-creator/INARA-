import { courseStatuses } from '../models/Course.js';
import CourseRepository from '../repositories/CourseRepository.js';


export async function listCourses(req, res) {

  try {

    const courses = await CourseRepository.findVisibleTo(req.user);

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



    if (!name || !instructor_id) {

      return res.status(400).json({
        message: 'Nombre e instructor son requeridos'
      });

    }



    if (!courseStatuses.includes(status)) {

      return res.status(400).json({
        message: 'Estado de curso invalido'
      });

    }



    const course = await CourseRepository.create({
      name,
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