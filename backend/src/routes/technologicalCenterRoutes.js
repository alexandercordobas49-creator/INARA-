import { Router } from 'express';
import { listTechnologicalCenters } from '../controllers/technologicalCenterController.js';

const router = Router();

// Directorio de consulta pública; la edición queda fuera de esta ruta.
router.get('/', listTechnologicalCenters);

export default router;
