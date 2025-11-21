const mongoose = require('mongoose');
const Product = require('../../models/product.model');
const Category = require('../../models/category.model');

function parseNumber(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function findCategoryFlexible(value) {
  if (!value) return null;
  // Primero por ObjectId válido
  if (isValidObjectId(value)) {
    const byId = await Category.findById(value);
    if (byId) return byId;
  }
  // Luego por slug o name
  return Category.findOne({ $or: [{ slug: value }, { name: value }] });
}

exports.list = async (req, res) => {
  try {
    const {
      q = '',
      category,
      brand,
      priceMin,
      priceMax,
      sort = 'relevance',
      page = 1,
      limit = 20
    } = req.query || {};

    const filter = { active: true };

    if (q) filter.$text = { $search: q };

    if (brand) filter.brand = new RegExp(`^${brand}$`, 'i');

    const min = parseNumber(priceMin, null);
    const max = parseNumber(priceMax, null);
    if (min != null || max != null) {
      filter.price = {};
      if (min != null) filter.price.$gte = min;
      if (max != null) filter.price.$lte = max;
    }

    if (category) {
      const cat = await findCategoryFlexible(category);
      if (cat) filter.category = cat._id;
      else return res.json({ items: [], total: 0, page: 1, pages: 0 });
    }

    let sortOpt = {};
    switch (sort) {
      case 'price_asc': sortOpt = { price: 1 }; break;
      case 'price_desc': sortOpt = { price: -1 }; break;
      case 'name_asc': sortOpt = { name: 1 }; break;
      case 'name_desc': sortOpt = { name: -1 }; break;
      case 'newest': sortOpt = { createdAt: -1 }; break;
      default: sortOpt = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total, brands] = await Promise.all([
      Product.find(filter)
        .populate('category')
        .sort(sortOpt)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
      Product.distinct('brand', filter)
    ]);

    return res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      filters: { brands: brands.sort((a, b) => (a > b ? 1 : -1)) }
    });
  } catch (err) {
    console.error('Error listando productos:', err);
    return res.status(500).json({ message: 'Error listando productos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const p = await Product.findById(id).populate('category');
    if (!p) return res.status(404).json({ message: 'No encontrado' });
    return res.json(p);
  } catch (err) {
    console.error('Error obteniendo producto:', err);
    return res.status(500).json({ message: 'Error obteniendo producto' });
  }
};

exports.create = async (req, res) => {
  try {
    const { category, code, name, brand, price } = req.body || {};
    if (!category || !code || !name || !brand || typeof price !== 'number') {
      return res.status(400).json({ message: 'category, code, name, brand, price requeridos' });
    }

    const cat = await findCategoryFlexible(category);
    if (!cat) return res.status(400).json({ message: 'Categoría no existe' });

    const exists = await Product.findOne({ code });
    if (exists) return res.status(400).json({ message: 'Código ya existe' });

    const p = await Product.create({
      category: cat._id,
      code,
      name,
      brand,
      price
    });
    return res.status(201).json(p);
  } catch (err) {
    console.error('Error creando producto:', err);
    return res.status(500).json({ message: 'Error creando producto' });
  }
};

exports.bulkUpsert = async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body.items || []);
    if (!list.length) return res.status(400).json({ message: 'Array vacío' });

    const catKeys = Array.from(new Set(list.map(x => String(x.category || '').trim()).filter(Boolean)));
    const catDocs = await Category.find({
      $or: [
        { slug: { $in: catKeys } },
        { name: { $in: catKeys } },
        { _id: { $in: catKeys.filter(isValidObjectId) } }
      ]
    });
    const catIndex = {};
    catDocs.forEach(c => { catIndex[c._id] = c; catIndex[c.slug] = c; catIndex[c.name] = c; });

    const ops = [];
    for (const it of list) {
      const cat = catIndex[it.category];
      if (!cat) continue;
      if (!it.code || !it.name || !it.brand || typeof it.price !== 'number') continue;

      ops.push({
        updateOne: {
          filter: { code: it.code },
            update: {
              $set: {
                category: cat._id,
                name: it.name,
                brand: it.brand,
                price: it.price,
                active: it.active !== false
              }
            },
          upsert: true
        }
      });
    }

    if (!ops.length) return res.status(400).json({ message: 'No hay items válidos' });
    const result = await Product.bulkWrite(ops, { ordered: false });
    return res.json({ message: 'Bulk upsert ok', result });
  } catch (err) {
    console.error('Error en carga masiva productos:', err);
    return res.status(500).json({ message: 'Error en carga masiva' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });

    const { category, name, brand, price, active } = req.body || {};
    const upd = {};

    if (category) {
      const cat = await findCategoryFlexible(category);
      if (!cat) return res.status(400).json({ message: 'Categoría no existe' });
      upd.category = cat._id;
    }
    if (name) upd.name = name;
    if (brand) upd.brand = brand;
    if (typeof price === 'number') upd.price = price;
    if (typeof active === 'boolean') upd.active = active;

    const p = await Product.findByIdAndUpdate(id, { $set: upd }, { new: true });
    if (!p) return res.status(404).json({ message: 'No encontrado' });
    return res.json(p);
  } catch (err) {
    console.error('Error actualizando producto:', err);
    return res.status(500).json({ message: 'Error actualizando producto' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
    const del = await Product.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ message: 'Eliminado' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    return res.status(500).json({ message: 'Error eliminando' });
  }
};