-- INARA: directorio geográfico de centros tecnológicos.
-- Migración aditiva: no modifica ni elimina tablas existentes.
CREATE TABLE IF NOT EXISTS public.technological_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_code varchar(80) UNIQUE,
  name varchar(220) NOT NULL,
  department varchar(100) NOT NULL,
  municipality varchar(120) NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  phone varchar(80),
  website text,
  programs jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_source_url text,
  verified_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technological_centers_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT technological_centers_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS idx_technological_centers_department_municipality
  ON public.technological_centers (department, municipality);
CREATE INDEX IF NOT EXISTS idx_technological_centers_active_name
  ON public.technological_centers (is_active, name);
CREATE INDEX IF NOT EXISTS idx_technological_centers_coordinates
  ON public.technological_centers (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
