import { pool } from '../config/database.js';

export async function listTechnologicalCenters(req, res) {
  try {
    const { department, municipality, search } = req.query;
    const values = [];
    const conditions = ['is_active = TRUE'];

    if (department) {
      values.push(String(department).trim());
      conditions.push(`LOWER(department) = LOWER($${values.length})`);
    }

    if (municipality) {
      values.push(String(municipality).trim());
      conditions.push(`LOWER(municipality) = LOWER($${values.length})`);
    }

    if (search) {
      values.push(`%${String(search).trim().slice(0, 100)}%`);
      conditions.push(`(name ILIKE $${values.length} OR department ILIKE $${values.length} OR municipality ILIKE $${values.length} OR address ILIKE $${values.length})`);
    }

    const result = await pool.query(
      `SELECT id, official_code, name, department, municipality, address,
              latitude, longitude, phone, website, programs, data_source_url, verified_at
       FROM public.technological_centers
       WHERE ${conditions.join(' AND ')}
       ORDER BY department, municipality, name`,
      values
    );

    res.json({
      data: result.rows,
      meta: { total: result.rowCount, source: 'INARA / directorio de centros tecnológicos' }
    });
  } catch (error) {
    console.error('Error al consultar centros tecnológicos:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los centros tecnológicos.' });
  }
}
