import jwt from 'jsonwebtoken';
import { findUserById } from '../repositories/UserRepository.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'JWT_SECRET no está configurado. Define una clave segura en las variables de entorno.'
    );
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  return secret;
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: '8h'
    }
  );
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
    const payload = jwt.verify(token, getJwtSecret());

    if (!payload?.id) {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }

    const user = await findUserById(payload.id);

    if (!user) {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message?.includes('JWT_SECRET')) {
      console.error(error.message);

      return res.status(500).json({
        message: 'Configuración de autenticación incompleta'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado'
      });
    }

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        message: 'Token inválido'
      });
    }

    console.error('Authentication error:', error);

    return res.status(401).json({
      message: 'No se pudo autenticar la solicitud'
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

    next();
  };
}
