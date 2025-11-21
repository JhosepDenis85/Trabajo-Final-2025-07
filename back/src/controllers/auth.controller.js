const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('../models/user.model');
const Role = require('../models/role.model');

// Compatibilidad: usa SECRET si existe, si no JWT_SECRET, fallback 'changeme'
const JWT_SECRET = process.env.SECRET || process.env.JWT_SECRET || 'changeme';
const TOKEN_EXP = process.env.AUTH_TOKEN_EXP || '1h';

// (Opcional) si quieres redirigir a un front distinto, define FRONTEND_URL
const FRONTEND_URL = process.env.FRONTEND_URL || '';

function sign(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: TOKEN_EXP });
}

exports.validate = async (req, res) => {
  try {
    const { email, username } = req.body || {};
    if (!email && !username) {
      return res.status(400).json({ message: 'Se requiere email o username' });
    }
    const found = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : [])
      ]
    });
    return res.status(200).json({ available: !found });
  } catch (err) {
    console.error('validate:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password, roles } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email y password son requeridos' });
    }

    const duplicated = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (duplicated) {
      return res.status(400).json({ message: 'Usuario o email ya existen' });
    }

    let roleIds = [];
    if (roles && roles.length) {
      const r = await Role.find({ name: { $in: roles } });
      roleIds = r.map(rg => rg._id);
    } else {
      const rUser = await Role.findOne({ name: 'user' });
      if (rUser) roleIds = [rUser._id];
    }

    const hashed = bcrypt.hashSync(password, 8);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashed,
      provider: 'local',
      roles: roleIds
    });

    return res.status(200).json({ message: 'Usuario creado', id: user._id });
  } catch (err) {
    console.error('signup:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
};

exports.signin = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'username y password son requeridos' });
    }
    const user = await User.findOne({ username, provider: 'local' }).populate('roles');
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = sign(user._id);
    return res.status(200).json({
      token,
      user: { id: user._id, email: user.email, username: user.username }
    });
  } catch (err) {
    console.error('signin:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
};

exports.profile = async (req, res) => {
  try {
    const u = await User.findById(req.userId).populate('roles');
    if (!u) {
      return res.status(404).json({ message: 'No encontrado' });
    }
    return res.json({
      id: u._id,
      email: u.email,
      username: u.username,
      provider: u.provider,
      roles: (u.roles || []).map(r => r.name)
    });
  } catch (err) {
    console.error('profile:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
};

// Callback Google -> genera JWT y redirige a página success.html con ?token=...
exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/api/auth/failed?reason=oauth');
    }

    const token = sign(req.user._id);

    // Si deseas redirigir al frontend externo, descomenta:
    // if (FRONTEND_URL) {
    //   return res.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(token)}&email=${encodeURIComponent(req.user.email)}&uid=${req.user._id}`);
    // }

    // Redirige al recurso estático success.html
    return res.redirect(`/success?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('googleCallback:', err);
    return res.redirect('/api/auth/failed?reason=exception');
  }
};

// Sirve la página estática success.html (el JS interno leerá el query param token)
exports.authSuccessPage = (_req, res) => {
  return res.sendFile(path.join(__dirname, '../../public/success.html'));
};

exports.authFailedPage = (req, res) => {
  return res.status(401).json({
    message: 'Autenticación fallida',
    reason: req.query.reason || ''
  });
};