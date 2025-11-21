const User = require('../models/user.model');
const Role = require('../models/role.model');

// Requiere que authJwt.verifyToken haya colocado req.userId
async function isAdmin(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ message: 'No autenticado' });
    const user = await User.findById(req.userId).populate('roles');
    if (!user) return res.status(401).json({ message: 'No autenticado' });
    const hasAdmin = (user.roles || []).some(r => r.name === 'admin');
    if (!hasAdmin) return res.status(403).json({ message: 'Requiere rol admin' });
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Error verificando rol' });
  }
}

module.exports = { isAdmin };