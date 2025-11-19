const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Role = require('../models/role.model');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function sign(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });
}

exports.validate = async (req, res) => {
  try {
    const { email, username } = req.body || {};
    if (!email && !username) return res.status(400).json({ message: 'Se requiere email o username' });
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
    const duplicated = await User.findOne({ $or: [{ email }, { username }] });
    if (duplicated) return res.status(400).json({ message: 'Usuario o email ya existen' });

    let roleIds = [];
    if (roles && roles.length) {
      const r = await Role.find({ name: { $in: roles } });
      roleIds = r.map((x) => x._id);
    } else {
      const rUser = await Role.findOne({ name: 'user' });
      if (rUser) roleIds = [rUser._id];
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
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
    if (!username || !password) return res.status(400).json({ message: 'username y password son requeridos' });
    const user = await User.findOne({ username, provider: 'local' }).populate('roles');
    if (!user || user.password !== password) return res.status(401).json({ message: 'Credenciales inválidas' });

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
    if (!u) return res.status(404).json({ message: 'No encontrado' });
    return res.json({
      id: u._id,
      email: u.email,
      username: u.username,
      provider: u.provider,
      roles: (u.roles || []).map((r) => r.name)
    });
  } catch (err) {
    console.error('profile:', err);
    return res.status(500).json({ message: 'Error interno' });
  }
};

// Callback de Google -> genera JWT y redirige a una ruta servida por Express
exports.googleCallback = (req, res) => {
  if (!req.user) return res.redirect('/api/auth/failed?reason=oauth');
  const token = sign(req.user._id);

  const wantsJson =
    req.query.mode === 'json' ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJson) {
    return res.json({ success: true, token, user: { id: req.user._id, email: req.user.email } });
  }

  return res.redirect(`/api/auth/success?token=${encodeURIComponent(token)}`);
};

// Página/endpoint para copiar el token (también soporta JSON)
exports.authSuccessPage = (req, res) => {
  const token = req.query.token || '';
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
  if (wantsJson) {
    if (!token) return res.status(400).json({ message: 'Falta token' });
    return res.json({ token });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Éxito</title></head><body style="font-family:Arial,Helvetica,sans-serif">
  <h1>Login con Google correcto</h1>
  ${token ? `<p><b>Token JWT:</b></p><pre style="white-space:pre-wrap;border:1px solid #ddd;padding:12px">${token}</pre>` : '<p>Sin token.</p>'}
  <p>Usa este token en Postman:</p>
  <pre>GET http://localhost:6969/api/auth/profile
Authorization: Bearer ${token || '<token>'}</pre>
</body></html>`);
};

exports.authFailedPage = (req, res) => {
  return res.status(401).json({ message: 'Autenticación fallida', reason: req.query.reason || '' });
};