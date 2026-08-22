import XPService from "../services/xpService.js";
import { findUserById } from "../repositories/UserRepository.js";
import { pool } from "../config/database.js";

async function isParentOf(parentId, childId) {
    const result = await pool.query(
        `
        SELECT 1
        FROM parent_relations
        WHERE parent_id = $1
          AND child_id = $2
        LIMIT 1
        `,
        [parentId, childId]
    );

    return result.rowCount > 0;
}

function canViewUser(req, userId) {
    if (!req.user) return false;

    if (req.user.role === "admin" || req.user.role === "instructor") {
        return true;
    }

    if (req.user.role === "student") {
        return req.user.id === userId;
    }

    return false;
}

export async function xpSummary(req, res) {
    try {
        const userId = req.params.userId;

        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        if (req.user?.role === "parent") {
            const allowed = await isParentOf(req.user.id, userId);

            if (!allowed) {
                return res.status(403).json({
                    message: "No autorizado"
                });
            }
        } else if (!canViewUser(req, userId)) {
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
