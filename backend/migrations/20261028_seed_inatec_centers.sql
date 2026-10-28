-- INARA map directory seed: initial public INATEC centers by department.
-- Source list: https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos
-- This is an initial directory, not a claim that each department has only one center.
-- Run after the technological_centers table migration. Safe to re-run by official_code.

INSERT INTO public.technological_centers
  (official_code, name, department, municipality, website, data_source_url, verified_at, programs, is_active)
VALUES
  ('INATEC-MAN-SIMON-BOLIVAR', 'Centro Tecnológico Simón Bolívar', 'Managua', 'Managua', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-NS-CORONEL-RUFO-MARIN', 'Centro Tecnológico Coronel Antonio Rufo Marín', 'Nueva Segovia', 'Ocotal', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-MAD-CHE-GUEVARA', 'Centro Tecnológico Che Guevara', 'Madriz', 'Somoto', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-EST-OLOF-PALME', 'Centro Tecnológico Olof Palme', 'Estelí', 'Estelí', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-JIN-HEROES-ASTURIAS', 'Centro Tecnológico Héroes y Mártires de Asturias', 'Jinotega', 'Jinotega', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-MAT-MONS-BENEDICTO', 'Centro Tecnológico Monseñor Benedicto Herrera', 'Matagalpa', 'Matagalpa', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-BOA-ALCIDES-MIRANDA', 'Centro Tecnológico Alcides Miranda Fitoria', 'Boaco', 'Boaco', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-CHO-GERMAN-POMARES', 'Centro Tecnológico Comandante Germán Pomares Ordóñez', 'Chontales', 'Juigalpa', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-LEO-JUAN-DIOS-MUNOZ', 'Centro Tecnológico Juan de Dios Muñoz Reyes', 'León', 'León', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-CHI-CARLOS-VANEGAS', 'Centro Tecnológico Carlos Manuel Vanegas Olivas', 'Chinandega', 'Chinandega', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-MAS-MONIMBO-HEROICO', 'Centro Tecnológico Monimbó Heroico', 'Masaya', 'Masaya', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-CAR-RICARDO-MORALES', 'Centro Tecnológico Ricardo Morales Avilés', 'Carazo', 'Diriamba', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-RIV-GASPAR-GARCIA', 'Centro Tecnológico Gaspar García Laviana', 'Rivas', 'Rivas', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-RSJ-JUAN-MARIA-BRENES', 'Centro Tecnológico Juan María Brenes Roque', 'Río San Juan', 'San Carlos', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-AN-HEROES-PUERTO-CABEZAS', 'Centro Tecnológico Héroes y Mártires de Puerto Cabezas', 'Atlántico Norte', 'Puerto Cabezas', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-AS-WILLIAM-SCHWARTZ', 'Centro Tecnológico William Schwartz Cunningham', 'Atlántico Sur', 'Bluefields', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true),
  ('INATEC-GRA-JOSE-DOLORES-ESTRADA', 'Centro Tecnológico General José Dolores Estrada', 'Granada', 'Nandaime', 'https://tecnacional.edu.ni/', 'https://serviciosenlinea.tecnacional.edu.ni/academicos/registro/cursos', CURRENT_DATE, '[]'::jsonb, true)
ON CONFLICT (official_code) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  municipality = EXCLUDED.municipality,
  website = EXCLUDED.website,
  data_source_url = EXCLUDED.data_source_url,
  verified_at = EXCLUDED.verified_at,
  updated_at = now(),
  is_active = true;
