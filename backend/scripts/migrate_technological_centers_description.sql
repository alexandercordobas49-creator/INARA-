-- INARA: additive migration for short, source-backed descriptions of INATEC centers.
-- Safe to run more than once.
ALTER TABLE public.technological_centers
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.technological_centers
SET description = CASE name
  WHEN 'Centro Tecnológico Bidkar Muñoz' THEN 'Centro de formación técnica del sector Comercio y Servicio. Su oferta registrada incluye Computación, Administración, Banca y Finanzas e inglés.'
  WHEN 'Centro Tecnológico Gral. Miguel Ángel Ortez' THEN 'Centro de formación técnica profesional del sector Comercio y Servicio, con ambientes didácticos equipados. Su oferta registrada incluye Cocina y Gastronomía, Pastelería y Panadería, y Servicio de Restaurante, Bar y Cafetería.'
  WHEN 'Centro Tecnológico Pedro Aráuz Palacios' THEN 'Centro de formación técnica orientado al sector Industria y Construcción. Su oferta registrada incluye Corte y Soldadura, Mecánica Automotriz de vehículos livianos diésel y gasolina, y Electricidad Industrial.'
  WHEN 'Centro Tecnológico General José Dolores Estrada' THEN 'Centro agropecuario ubicado en Nandaime. La ficha oficial describe formación técnica con finca didáctica productiva y forestal-ecológica, granjas porcina y avícola, y establecimiento ovino.'
  ELSE description
END
WHERE department = 'Granada'
  AND name IN (
    'Centro Tecnológico Bidkar Muñoz',
    'Centro Tecnológico Gral. Miguel Ángel Ortez',
    'Centro Tecnológico Pedro Aráuz Palacios',
    'Centro Tecnológico General José Dolores Estrada'
  );
