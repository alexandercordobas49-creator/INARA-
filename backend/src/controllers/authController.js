import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { roles } from '../models/User.js';
import { createUser, findUserByEmail, updatePasswordByEmail } from '../repositories/UserRepository.js';
import { signToken } from '../middleware/authMiddleware.js';

const SALT_ROUNDS = 10;


export async function login(req, res) {

  const { email, password } = req.body;


  const user = await findUserByEmail(email);


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
    password,
    role = 'student'
  } = req.body;



  if (!firstName || !lastName || !email || !password) {

    return res.status(400).json({
      message: 'Completa nombre, apellido, correo y contrasena'
    });

  }



  if (!roles.includes(role)) {

    return res.status(400).json({
      message: 'Rol invalido'
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
  const user = await findUserByEmail(email);
  // For demo/dev: generate a token and return it in response (simulate email)
  const token = crypto.randomBytes(20).toString('hex');

  if (!user) {
    // Do not reveal whether user exists
    return res.json({ message: 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.' });
  }

  // In a real app: store the token and expiry, send email with link
  return res.json({ message: 'Token generado (dev):', token });
}

export async function resetPassword(req, res) {
  const { email, token, password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ message: 'Usuario no encontrado' });
  }

  // In a real app: verify the token. Here we accept any token for dev purposes.
  const hashed = await bcrypt.hash(password, 10);
  const updated = await updatePasswordByEmail(email, hashed);

  if (!updated) {
    return res.status(500).json({ message: 'Error actualizando la contraseña' });
  }

  return res.json({ message: 'Contraseña restablecida correctamente' });
}