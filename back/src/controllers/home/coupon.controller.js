const Coupon = require('../../models/coupon.model');

function isActiveNow(c) {
  const now = new Date();
  if (c.validFrom && now < c.validFrom) return false;
  if (c.validTo && now > c.validTo) return false;
  if (!c.active) return false;
  if (Number.isFinite(c.maxUses) && c.uses >= c.maxUses) return false;
  return true;
}

exports.list = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true') filter.active = true;
    const items = await Coupon.find(filter).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ message: 'Error listando cupones' });
  }
};

exports.create = async (req, res) => {
  try {
    const { code, description = '', type, value, minSubtotal = 0, validFrom, validTo, active = true, maxUses } = req.body || {};
    if (!code || !type || typeof value !== 'number') {
      return res.status(400).json({ message: 'code, type y value son requeridos' });
    }
    const exists = await Coupon.findOne({ code: String(code).toUpperCase() });
    if (exists) return res.status(400).json({ message: 'Cupón ya existe' });

    const c = await Coupon.create({
      code: String(code).toUpperCase(),
      description, type, value, minSubtotal,
      validFrom, validTo, active, maxUses
    });
    return res.status(201).json(c);
  } catch (err) {
    return res.status(500).json({ message: 'Error creando cupón' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.code) payload.code = String(payload.code).toUpperCase();
    const out = await Coupon.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!out) return res.status(404).json({ message: 'No encontrado' });
    return res.json(out);
  } catch (err) {
    return res.status(500).json({ message: 'Error actualizando cupón' });
  }
};

exports.remove = async (req, res) => {
  try {
    const del = await Coupon.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error eliminando cupón' });
  }
};

exports.getByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const c = await Coupon.findOne({ code });
    if (!c) return res.status(404).json({ message: 'No encontrado' });
    return res.json(c);
  } catch (err) {
    return res.status(500).json({ message: 'Error obteniendo cupón' });
  }
};

exports.validate = async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    if (!code || typeof subtotal !== 'number') {
      return res.status(400).json({ message: 'code y subtotal requeridos' });
    }
    const c = await Coupon.findOne({ code: String(code).toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Cupón no existe' });
    if (!isActiveNow(c)) return res.status(400).json({ message: 'Cupón inactivo o vencido' });
    if (subtotal < (c.minSubtotal || 0)) return res.status(400).json({ message: 'Subtotal no cumple mínimo' });

    let discount = 0;
    if (c.type === 'percent') discount = Math.round((subtotal * c.value) * 100) / 100 / 100; // value en %
    if (c.type === 'amount') discount = c.value;

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    return res.json({
      code: c.code,
      type: c.type,
      value: c.value,
      minSubtotal: c.minSubtotal || 0,
      discount,
      subtotal,
      total
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error validando cupón' });
  }
};