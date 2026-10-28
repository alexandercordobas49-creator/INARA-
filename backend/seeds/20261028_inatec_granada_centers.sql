-- Idempotent seed of three official INATEC technological centers in Granada.
-- Names, contact details, addresses and programs sourced from the official INATEC pages.
-- Pedro Arauz Palacios coordinates sourced from OpenStreetMap via Mapcarta:
-- https://mapcarta.com/es/28378342. Other coordinates are intentionally NULL until verified.
INSERT INTO public.technological_centers
(official_code, name, department, municipality, address, latitude, longitude, phone, website, programs, data_source_url, verified_at, is_active)
VALUES
('INATEC-GRA-BIDKAR', 'Centro Tecnológico Bidkart Muñoz', 'Granada', 'Granada',
 'Policía de Tránsito, 1½ cuadras al norte, Granada', NULL, NULL, '2552-6875',
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-bidkar-munoz/',
 '["Técnico General en Computación", "Técnico Especialista en Banca y Finanzas", "Técnico General en Administración", "English A1 Breakthrough", "English A2 Waystage", "English B1 Threshold"]'::jsonb,
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-bidkar-munoz/', CURRENT_DATE, true),
('INATEC-GRA-MIGUEL-ORTEZ', 'Centro Tecnológico Gral. Miguel Ángel Ortez', 'Granada', 'Granada',
 'Del Centro Escolar José de la Cruz Mena, 300 metros al suroeste, hacia residencial Praderas del Mombacho, El Madroño, Granada',
 NULL, NULL, '2552-6521',
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-granada/',
 '["Comercio y Servicio", "Técnico General en Cocina y Gastronomía", "Técnico General en Pastelería y Panadería", "Técnico General en Servicio de Restaurante, Bar y Cafetería"]'::jsonb,
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-granada/', CURRENT_DATE, true),
('INATEC-GRA-PEDRO-ARAUZ', 'Centro Tecnológico Pedro Aráuz Palacios', 'Granada', 'Granada',
 'Final avenida España N.º 1, salida a Malacatoya, frente al Gran Lago de Nicaragua, Granada',
 11.9432, -85.9466, '2552-5970',
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-pedro-arauz-palacios/',
 '["Técnico General en Corte y Soldadura", "Técnico General en Mecánica Automotriz de vehículos livianos Diesel y Gasolina", "Técnico General en Electricidad Industrial"]'::jsonb,
 'https://www.tecnacional.edu.ni/centro/centro-tecnologico-pedro-arauz-palacios/', CURRENT_DATE, true)
ON CONFLICT (official_code) DO NOTHING;
