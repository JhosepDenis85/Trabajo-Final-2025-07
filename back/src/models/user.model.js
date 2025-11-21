const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email:    { type: String, unique: true, required: true, trim: true },
  password: { type: String }, // se mantiene (selección por defecto)
  provider: { type: String, default: 'local' }, // local | google
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }
  ]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;