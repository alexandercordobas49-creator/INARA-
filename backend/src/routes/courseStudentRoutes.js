import { Router } from "express";

import {
    listCourseStudents,
    listStudentsByCourse,
    listCoursesByStudent,
    createCourseStudent
} from "../controllers/courseStudentController.js";

import {
    authenticateToken,
    authorizeRoles
} from "../middleware/authMiddleware.js";


const router = Router();


router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    listCourseStudents
);


router.get(
    "/course/:id",
    authenticateToken,
    authorizeRoles("admin", "instructor"),
    listStudentsByCourse
);


router.get(
    "/student/:id",
    authenticateToken,
    authorizeRoles("admin", "instructor", "student"),
    listCoursesByStudent
);


router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "instructor"),
    createCourseStudent
);


export default router;