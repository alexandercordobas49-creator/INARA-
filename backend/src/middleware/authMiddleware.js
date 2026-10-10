import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { findUserById } from '../repositories/UserRepository.js';

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    if (secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
    }
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }

  return crypto.randomBytes(32).toString('hex');
}

export const JWT_SECRET = resolveJwtSecret();

export function signToken(user) {
  if (!user || !user.id) {
    throw new Error('Se requiere un usuario válido para firmar el token');
  }

  const payload = {
    id: user.id,
    role: user.role,
    sid: user.sessionId || null
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h'
  });
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      message: 'Token no proporcionado'
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload || !payload.id || !payload.sid) {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }

    const session = await pool.query(
      `
        SELECT id, user_id, token_hash, revoked_at, expires_at
        FROM sessions
        WHERE id = $1 AND user_id = $2
      `,
      [payload.sid, payload.id]
    );

    const activeSession = session.rows[0];
    if (!activeSession || activeSession.revoked_at || new Date(activeSession.expires_at) < new Date()) {
      return res.status(401).json({
        message: 'Token inválido o expirado'
      });
    }

    if (activeSession.token_hash !== tokenHash(token)) {
      return res.status(401).json({
        message: 'Token inválido o expirado'
      });
    }

    const user = await findUserById(payload.id);

    if (!user) {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido o expirado'
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No autorizado'
      });
    }

    return next();
  };
}

export function isParentOf(data, parentId, childId) {
  return (data.parentRelations || []).some(
    (relation) =>
      relation.parentId === parentId &&
      relation.childId === childId
  );
}