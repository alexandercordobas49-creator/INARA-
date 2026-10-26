import XPService from "../services/xpService.js";
import { findUserById } from "../repositories/UserRepository.js";
import { pool } from "../config/database.js";
import { canAccessStudent } from '../middleware/accessControl.js';

export async function xpSummary(req, res) {
    try {
        const userId = req.params.userId;

        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        if (user.role !== 'student' || !(await canAccessStudent(req.user, userId))) {
            return res.status(403).json({
                message: "No autorizado"
            });
        }

        const xpEvents = await XPService.getHistory(userId);
        const totalXp = await XPService.getTotalXp(userId);

        return res.json({
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                current_level: user.current_level,
                total_xp: totalXp
            },
            xpEvents
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error obteniendo información de XP"
        });
    }
}
