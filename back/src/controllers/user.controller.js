const db = require('../models');

const User = db.user;
const Role = db.role;

// ---- ENDPOINTS ORIGINALES ----
exports.allAccess = (_req, res) => {
  res.status(200).send('Contenido Public');
};

exports.onlyUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(`Contenido del Usuario ${user.username}`);
  } catch (err) {
    return res.status(500).send({ message: 'Error interno' });
  }
};

exports.onlyModerator = (_req, res) => {
  res.status(200).send('Contenido del Moderator');
};

exports.onlyAdmin = (_req, res) => {
  res.status(200).send('Contenido del Admin');
};

// ---- NUEVOS ENDPOINTS DE ROLES/USUARIOS ----
exports.listUsers = async (_req, res) => {
  try {
    const users = await User.find({}).populate('roles');
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Error listando usuarios' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('roles');
    if (!user) return res.status(404).json({ message: 'No encontrado' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Error obteniendo usuario' });
  }
};

exports.updateUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body || {};
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'Array roles requerido' });
    }
    const roleDocs = await Role.find({ name: { $in: roles } });
    if (!roleDocs.length) {
      return res.status(400).json({ message: 'Roles no válidos' });
    }
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { roles: roleDocs.map(r => r._id) } },
      { new: true }
    ).populate('roles');
    if (!updated) return res.status(404).json({ message: 'No encontrado' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Error actualizando roles' });
  }
};