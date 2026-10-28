import { pool } from "../config/database.js";


const XpRepository = {


    async create({
        userId,
        points,
        source,
        description
    }) {

        const result = await pool.query(
            `
            INSERT INTO xp_events
            (
                user_id,
                points,
                source,
                description
            )
            VALUES ($1,$2,$3,$4)
            RETURNING *
            `,
            [
                userId,
                points,
                source,
                description
            ]
        );


        return result.rows[0];

    },


    async findByUser(userId) {

        const result = await pool.query(
            `
            SELECT *
            FROM xp_events
            WHERE user_id=$1
              AND COALESCE(description, '') NOT ILIKE '%piloto%'
              AND COALESCE(description, '') NOT ILIKE '%escenario%'
            ORDER BY created_at DESC
            `,
            [
                userId
            ]
        );


        return result.rows;

    },


    async totalXp(userId) {

        const result = await pool.query(
            `
            SELECT COALESCE(SUM(points),0) AS total
            FROM xp_events
            WHERE user_id=$1
              AND COALESCE(description, '') NOT ILIKE '%piloto%'
              AND COALESCE(description, '') NOT ILIKE '%escenario%'
            `,
            [
                userId
            ]
        );


        return Number(result.rows[0].total);

    },


    async updateUserXp(userId, points) {

        const result = await pool.query(
            `
            UPDATE users
            SET total_xp = total_xp + $1
            WHERE id = $2
            RETURNING *
            `,
            [
                points,
                userId
            ]
        );


        return result.rows[0];

    },


    async updateLevel(userId) {

        const result = await pool.query(
            `
            UPDATE users
            SET current_level = (
                SELECT level_number
                FROM levels
                WHERE min_xp <= users.total_xp
                ORDER BY min_xp DESC
                LIMIT 1
            )
            WHERE id=$1
            RETURNING *
            `,
            [
                userId
            ]
        );


        return result.rows[0];

    }


};


export default XpRepository;