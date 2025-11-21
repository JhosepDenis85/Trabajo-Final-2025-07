const mongoose = require('mongoose');
const Role = require('./role.model');
const User = require('./user.model');

// Crea roles requeridos si faltan
async function init() {
  const required = ['user', 'admin', 'moderator'];

  const count = await Role.estimatedDocumentCount();
  if (count === 0) {
    await Role.insertMany(required.map((name) => ({ name })));
    console.log('[seed] roles creados:', required.join(', '));
    return;
  }

  for (const name of required) {
    const exists = await Role.findOne({ name });
    if (!exists) {
      await Role.create({ name });
      console.log(`[seed] rol creado: ${name}`);
    }
  }
}

// Alias esperado por index.js del servidor (compatibilidad)
async function createRoles() {
  return init();
}

// Utilidad opcional para obtener IDs de roles por nombre (no altera APIs)
async function getRoleIds(names = []) {
  if (!Array.isArray(names) || names.length === 0) return [];
  const roles = await Role.find({ name: { $in: names } }, '_id name');
  return roles.map(r => r._id);
}

module.exports = {
  mongoose,
  role: Role,
  user: User,
  init,
  createRoles,
  getRoleIds
};