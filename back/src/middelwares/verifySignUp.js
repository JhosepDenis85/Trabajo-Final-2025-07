const db = require('../models');
const User = db.user;

const ROLES = ['user', 'admin', 'moderator'];

// Valida duplicados solo si el campo viene; no obliga username y email aquí.
const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : undefined;

    if (username) {
      const byUser = await User.findOne({ username });
      if (byUser) return res.status(409).json({ message: 'El username ya está en uso' });
    }
    if (email) {
      const byEmail = await User.findOne({ email });
      if (byEmail) return res.status(409).json({ message: 'El email ya está registrado' });
    }

    return next();
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error interno' });
  }
};

const checkRoleExisted = (req, res, next) => {
  const roles = Array.isArray(req.body?.roles) ? req.body.roles : [];
  for (const role of roles) {
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: `El rol ${role} no existe` });
    }
  }
  return next();
};

module.exports = { checkDuplicateUsernameOrEmail, checkRoleExisted };