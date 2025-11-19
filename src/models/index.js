const mongoose = require('mongoose');
const Role = require('./role.model');
const User = require('./user.model');

// Crea roles requeridos si faltan
async function init() {
  const required = ['user', 'admin', 'moderator'];

  // Si la colección está vacía, inserta todos
  const count = await Role.estimatedDocumentCount();
  if (count === 0) {
    await Role.insertMany(required.map((name) => ({ name })));
    console.log('[seed] roles creados:', required.join(', '));
    return;
  }

  // Si existen algunos, asegura los faltantes
  for (const name of required) {
    const exists = await Role.findOne({ name });
    if (!exists) {
      await Role.create({ name });
      console.log(`[seed] rol creado: ${name}`);
    }
  }
}

module.exports = {
  mongoose,
  role: Role,
  user: User,
  init
};