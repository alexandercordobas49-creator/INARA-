import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  createUser,
  findUserByEmail,
  updatePasswordByEmail,
  saveResetToken,
  consumeResetToken
} from '../repositories/UserRepository.js';
import { signToken } from '../middleware/authMiddleware.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_MINUTES = 15;

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

export async function login(req, res) {

  const { email, password } = req.body;


  const user = await findUserByEmail(email);

  if (process.env.NODE_ENV === 'production' && String(user?.email || '').toLowerCase().endsWith('.demo')) {
    return res.status(403).json({ message: 'Las cuentas de demostración no están habilitadas en producción. Ingresa con una cuenta real.' });
  }

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {

    return res.status(401).json({
      message: 'Credenciales invalidas'
    });

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

  const {
    firstName,
    lastName,
    email,
    password
  } = req.body;

  const role = 'student';


  if (!firstName || !lastName || !email || !password) {

    return res.status(400).json({
      message: 'Completa nombre, apellido, correo y contrasena'
    });

  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      message: 'La contrasena debe tener al menos 8 caracteres'
    });

  }

  const exists = await findUserByEmail(email);


  if (exists) {

    return res.status(409).json({
      message: 'Ese correo ya esta registrado'
    });

  }



  const hashedPassword = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );



  const user = await createUser({

    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: hashedPassword,
    role

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

}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const genericResponse = {
    message: 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.'
  };

  const user = await findUserByEmail(email);

  if (!user) return res.json(genericResponse);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await saveResetToken(user.id, hashToken(token), expiresAt);

  return res.json(genericResponse);
}

export async function resetPassword(req, res) {
  const { email, token, password } = req.body;

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const user = await findUserByEmail(email);
  const valid = user && (await consumeResetToken(user.id, hashToken(token)));

  if (!valid) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const updated = await updatePasswordByEmail(email, hashed);

  if (!updated) {
    return res.status(500).json({ message: 'Error actualizando la contraseña' });
  }

  return res.json({ message: 'Contraseña restablecida correctamente' });
}