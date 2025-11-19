const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Middleware para verificar JWT
exports.verifyToken = (req, res, next) => {
  let token =
    req.headers['x-access-token'] ||
    req.headers['authorization'] ||
    req.query.token ||
    '';

  // Si viene como "Bearer xxx"
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ message: 'No estás enviando el token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};