import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { roles } from '../models/User.js';
import { pool } from '../config/database.js';
import { createUser, findUserByEmail } from '../repositories/UserRepository.js';
import { signToken } from '../middleware/authMiddleware.js';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
const EMAIL_SERVICE_CONFIGURED = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

function isStrongPassword(password) {
  return typeof password === 'string' &&
    password.length >= 8 &&
    Buffer.byteLength(password, 'utf8') <= 72 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);
}

function matchesTokenHash(storedHash, candidateHash) {
  if (
    typeof storedHash !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(storedHash) ||
    storedHash.length !== candidateHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(candidateHash, 'hex')
  );
}

async function sendPasswordResetEmail(email, token) {
  if (!EMAIL_SERVICE_CONFIGURED) {
    return { delivered: false, reason: 'EMAIL_HOST, EMAIL_USER y EMAIL_PASS no están configurados' };
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: process.env.EMAIL_USER && process.env.EMAIL_PASS
      ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      : undefined
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'INARA <no-reply@inara.local>',
    to: email,
    subject: 'Restablece tu contraseña de INARA',
    text: `Usa este enlace para restablecer tu contraseña: ${resetUrl}`
  });

  return { delivered: true };
}

async function createSessionToken(user) {
  const sessionResult = await pool.query(
    `
      INSERT INTO sessions (user_id, token_hash, issued_at, expires_at, revoked_at)
      VALUES ($1, '', NOW(), NOW() + INTERVAL '8 hours', NULL)
      RETURNING id
    `,
    [user.id]
  );

  const sessionId = sessionResult.rows[0].id;
  const token = signToken({ ...user, sessionId });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(
    `
      UPDATE sessions
      SET token_hash = $1
      WHERE id = $2
    `,
    [tokenHash, sessionId]
  );

  return token;
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ message: 'Faltan campos: email, password' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({
      message: 'Credenciales inválidas'
    });
  }

  const token = await createSessionToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    }
  });
}

export async function register(req, res) {
  const {
    firstName,
    lastName,
    email,
    password,
    role
  } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      message: 'Completa nombre, apellido, correo y contraseña'
    });
  }

  if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Datos inválidos' });
  }

  if (
    firstName.trim().length < 2 || firstName.trim().length > 80 ||
    lastName.trim().length < 2 || lastName.trim().length > 80 ||
    email.trim().length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({ message: 'Nombre, apellido o correo inválidos' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener entre 8 y 72 bytes e incluir letras y números' });
  }

  const requestedRole = role || 'student';
  if (requestedRole !== 'student' && requestedRole !== undefined) {
    return res.status(403).json({ message: 'No está permitido registrarse con un rol privilegiado' });
  }

  if (!roles.includes('student')) {
    return res.status(500).json({ message: 'Configuración de roles no válida' });
  }

  const exists = await findUserByEmail(email.trim().toLowerCase());
  if (exists) {
    return res.status(409).json({
      message: 'Ese correo ya está registrado'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashedPassword,
      role: 'student'
    });
    const token = await createSessionToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(409).json({ message: 'Ese correo ya está registrado' });
    }

    return res.status(500).json({ message: 'No se pudo completar el registro' });
  }
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (typeof email !== 'string' || !email.trim() || email.trim().length > 160) {
    return res.status(400).json({ message: 'Correo inválido' });
  }

  if (!EMAIL_SERVICE_CONFIGURED) {
    return res.status(503).json({
      message: 'El servicio de recuperación no está configurado. Configure EMAIL_HOST, EMAIL_USER y EMAIL_PASS.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return res.json({ message: 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);

  await pool.query(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
      VALUES ($1, $2, $3, NULL)
      ON CONFLICT (user_id)
      DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, used_at = NULL, created_at = NOW()
    `,
    [user.id, tokenHash, expiresAt]
  );

  try {
    await sendPasswordResetEmail(normalizedEmail, resetToken);
  } catch (error) {
    try {
      await pool.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND token_hash = $2',
        [user.id, tokenHash]
      );
    } catch (cleanupError) {
      console.error('Failed to invalidate undelivered password reset token:', cleanupError.message);
    }
    console.error('Password reset email delivery failed:', error.message);
  }

  return res.status(202).json({
    message: 'Si la cuenta existe, se enviarán instrucciones cuando el servicio de correo esté disponible.'
  });
}

export async function resetPassword(req, res) {
  const { email, token, password } = req.body;

  if (
    typeof email !== 'string' || !email.trim() || email.trim().length > 160 ||
    typeof token !== 'string' || !token ||
    typeof password !== 'string' || !password
  ) {
    return res.status(400).json({ message: 'Faltan campos: email, token y password' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener entre 8 y 72 bytes e incluir letras y números' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const tokenRecord = await client.query(
      `
        SELECT id, token_hash, expires_at, used_at
        FROM password_reset_tokens
        WHERE user_id = $1
        FOR UPDATE
      `,
      [user.id]
    );

    const record = tokenRecord.rows[0];
    if (!record || !matchesTokenHash(record.token_hash, tokenHash) || record.used_at || new Date(record.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    const updated = await client.query(
      `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `,
      [hashed, user.id]
    );

    if (!updated.rows.length) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(500).json({ message: 'Error actualizando la contraseña' });
    }

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW(), expires_at = NOW()
        WHERE id = $1
      `,
      [record.id]
    );

    await client.query(
      `
        UPDATE sessions
        SET revoked_at = NOW(), expires_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [user.id]
    );

    await client.query('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('No se pudo revertir la transacción de restablecimiento:', rollbackError.message);
      }
    }
    console.error('Error al restablecer contraseña:', error);
    return res.status(500).json({ message: 'No se pudo restablecer la contraseña' });
  } finally {
    client.release();
  }

  return res.json({ message: 'Contraseña restablecida correctamente' });
}