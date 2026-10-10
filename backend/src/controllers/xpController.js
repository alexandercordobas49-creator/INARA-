import XPService from "../services/xpService.js";
import { findUserById } from "../repositories/UserRepository.js";
import FamilyRepository from '../repositories/FamilyRepository.js';

async function canAccessUser(actor, targetUserId) {
    if (actor.role === 'admin') {
        return true;
    }

    if (actor.role === 'student') {
        return actor.id === targetUserId;
    }

    if (actor.role === 'parent') {
          return FamilyRepository.isParentOf(actor.id, targetUserId);
    }

    return false;
}

export async function xpSummary(req, res) {
    try {
        const userId = req.params.userId;

        if (!(await canAccessUser(req.user, userId))) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        const xpEvents = await XPService.getHistory(userId);
        const totalXp = await XPService.getTotalXp(userId);

        return res.json({
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                total_xp: totalXp,
                current_level: user.current_level
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