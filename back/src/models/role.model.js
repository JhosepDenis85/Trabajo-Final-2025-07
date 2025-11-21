const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true }
}, { timestamps: true });

// Índice de seguridad (si ya existen docs sin unique no rompe, pero ayuda futuras inserciones)
roleSchema.index({ name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;