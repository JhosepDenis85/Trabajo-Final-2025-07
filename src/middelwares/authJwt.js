const jwt = require('jsonwebtoken');
const db = require('../models');

const User = db.user;
const Role = db.role;

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Middleware para verificar JWT
exports.verifyToken = (req, res, next) => {
  let token =
    req.headers['x-access-token'] ||
    req.headers['authorization'] ||
    req.query.token ||
    '';

  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ message: 'No estás enviando el token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Verificar rol moderator
exports.isModerator = async (req, res, next) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'No autenticado' });
    const user = await User.findById(req.userId).populate('roles').exec();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const hasRole = (user.roles || []).some(r => r.name === 'moderator' || r.name === 'admin');
    if (!hasRole) return res.status(403).json({ message: 'Requiere rol moderator' });
    return next();
  } catch {
    return res.status(500).json({ message: 'Error verificando rol moderator' });
  }
};

// Verificar rol admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'No autenticado' });
    const user = await User.findById(req.userId).populate('roles').exec();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const hasRole = (user.roles || []).some(r => r.name === 'admin');
    if (!hasRole) return res.status(403).json({ message: 'Requiere rol admin' });
    return next();
  } catch {
    return res.status(500).json({ message: 'Error verificando rol admin' });
  }
};