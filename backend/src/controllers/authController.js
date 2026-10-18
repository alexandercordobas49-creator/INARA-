import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { createUser, findUserByEmail } from '../repositories/UserRepository.js';
import { signToken } from '../middleware/authMiddleware.js';
import { sendEmailNotification } from '../lib/notificationService.js';

const SALT_ROUNDS = 10;
const genericResetMessage = 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.';

export async function login(req, res) {
  const { password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  return res.json({
    token: signToken(user),
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
  const { firstName, lastName, password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!firstName?.trim() || !lastName?.trim() || !email || !password) {
    return res.status(400).json({ message: 'Completa nombre, apellido, correo y contraseña' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  // El registro público siempre crea estudiantes. Los demás roles los asigna un administrador.
  const exists = await findUserByEmail(email);
  if (exists) {
    return res.status(409).json({ message: 'Ese correo ya está registrado' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email,
      password_hash: passwordHash,
      role: 'student'
    });

    return res.status(201).json({
      token: signToken(user),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ese correo ya está registrado' });
    }
    throw error;
  }
}

export async function forgotPassword(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await findUserByEmail(email);

  // Misma respuesta para cuentas existentes e inexistentes para evitar enumeración.
  if (!user) return res.json({ message: genericResetMessage });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [user.id]
  );
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')",
    [user.id, tokenHash]
  );

  const emailConfigured = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  if (emailConfigured) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    try {
      const sent = await sendEmailNotification(
        email,
        'Restablecer contraseña de INARA',
        `<p>Recibimos una solicitud para cambiar tu contraseña de INARA.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace vence en 30 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`
      );
      if (!sent.success) throw new Error('No se pudo enviar el correo de recuperación');
    } catch (error) {
      await pool.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );
      console.error('No se pudo enviar el correo de recuperación:', error.message);
      return res.json({ message: genericResetMessage });
    }
    return res.json({ message: genericResetMessage });
  }

  // En desarrollo se devuelve el token para pruebas; en producción nunca se expone.
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ message: 'Token de desarrollo; vence en 30 minutos.', token });
  }

  await pool.query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
    [user.id]
  );
  console.error('Recuperación de contraseña no disponible: falta configurar SMTP.');
  return res.json({ message: genericResetMessage });
}

export async function resetPassword(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { token, password } = req.body;

  if (!email || !token || !password || password.length < 8) {
    return res.status(400).json({ message: 'Indica correo, token y una contraseña de al menos 8 caracteres' });
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE u.email = $1
         AND prt.token_hash = $2
         AND prt.expires_at > NOW()
         AND prt.used_at IS NULL
       FOR UPDATE OF prt`,
      [email, tokenHash]
    );

    if (!tokenResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El token es inválido o ha vencido' });
    }

    const userId = tokenResult.rows[0].user_id;
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );
    await client.query('COMMIT');

    return res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
