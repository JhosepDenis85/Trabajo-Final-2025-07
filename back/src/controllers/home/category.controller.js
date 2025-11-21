const mongoose = require('mongoose');
const Category = require('../../models/category.model');
const Product = require('../../models/product.model');

function slugify(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.list = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q ? { name: new RegExp(q, 'i') } : {};
    const items = await Category.find(filter).sort({ name: 1 });
    return res.json(items);
  } catch (err) {
    console.error('Error listando categorías:', err);
    return res.status(500).json({ message: 'Error listando categorías' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, active = true } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name requerido' });
    const slug = slugify(name);
    const exists = await Category.findOne({ $or: [{ name }, { slug }] });
    if (exists) return res.status(400).json({ message: 'Categoría ya existe' });
    const cat = await Category.create({ name, slug, active });
    return res.status(201).json(cat);
  } catch (err) {
    console.error('Error creando categoría:', err);
    return res.status(500).json({ message: 'Error creando categoría' });
  }
};

exports.bulk = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body.items || []);
    if (!list.length) return res.status(400).json({ message: 'Array vacío' });
    const ops = list.map(x => ({
      updateOne: {
        filter: { slug: slugify(x.name) },
        update: { $setOnInsert: { name: x.name, slug: slugify(x.name), active: true } },
        upsert: true
      }
    }));
    await Category.bulkWrite(ops, { ordered: false });
    const all = await Category.find({}).sort({ name: 1 });
    return res.json(all);
  } catch (err) {
    console.error('Error en carga masiva categorías:', err);
    return res.status(500).json({ message: 'Error en carga masiva' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body || {};
    const upd = {};
    if (name) {
      upd.name = name;
      upd.slug = slugify(name);
    }
    if (typeof active === 'boolean') upd.active = active;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const out = await Category.findByIdAndUpdate(id, { $set: upd }, { new: true });
    if (!out) return res.status(404).json({ message: 'No encontrado' });
    return res.json(out);
  } catch (err) {
    console.error('Error actualizando categoría:', err);
    return res.status(500).json({ message: 'Error actualizando categoría' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const count = await Product.countDocuments({ category: id });
    if (count > 0) return res.status(409).json({ message: 'No se puede eliminar, hay productos asociados' });
    const del = await Category.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    console.error('Error eliminando categoría:', err);
    return res.status(500).json({ message: 'Error eliminando' });
  }
};