-- ==========================================
-- INARA v2.0
-- Módulo: Matrícula de estudiantes
-- Archivo: 007_course_students.sql
--
-- Objetivo:
-- Conectar estudiantes con cursos.
--
-- Permite:
-- - Saber qué estudiantes pertenecen a cada curso.
-- - Saber qué cursos lleva cada estudiante.
-- - Preparar asistencia, XP, riesgo académico
--   y análisis de Atlas.
-- ==========================================
-- Estados posibles de una matrícula
DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM (
    'active',
    'completed',
    'withdrawn',
    'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- Relación entre estudiantes y cursos
CREATE TABLE IF NOT EXISTS course_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    course_id UUID NOT NULL
        REFERENCES courses(id)
        ON DELETE CASCADE,

    student_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    status enrollment_status NOT NULL DEFAULT 'active',

    UNIQUE(course_id, student_id)
);
-- Índices para consultas rápidas

CREATE INDEX IF NOT EXISTS idx_course_students_course
ON course_students(course_id);

CREATE INDEX IF NOT EXISTS idx_course_students_student
ON course_students(student_id);