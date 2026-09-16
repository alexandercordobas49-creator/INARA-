import XpRepository from "../repositories/XpRepository.js";
import LevelService from "./levelService.js";
import { evaluateStudentRisk } from './riskService.js';

const XPService = {

    async addXP({
        userId,
        points,
        source,
        description
    }) {

        // Registrar el evento de XP
        const event = await XpRepository.create({
            userId,
            points,
            source,
            description
        });

        // Actualizar el XP total del usuario
        const user = await XpRepository.updateUserXp(
            userId,
            points
        );

        // Recalcular el nivel
        const level = await LevelService.updateUserLevel(userId);
        const risk = await evaluateStudentRisk(userId);

        return {
            event,
            user,
            level,
            risk: risk.risk
        };

    },

    async getHistory(userId) {

        return await XpRepository.findByUser(userId);

    },

    async getTotalXp(userId) {

        return await XpRepository.totalXp(userId);

    }

};

export default XPService;