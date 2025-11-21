const mongoose = require('mongoose');
const Order = require('../../models/order.model');
const User = require('../../models/user.model');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function mapOrder(o) {
  // Si no hay timestamps en el schema, se deriva de _id
  const createdAt = o.createdAt || (o._id.getTimestamp ? o._id.getTimestamp() : null);
  const updatedAt = o.updatedAt || createdAt;
  return {
    orderId: o.orderId || null,
    draftId: o.draftId,
    status: o.status,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    items: (o.items || []).map(it => ({
      code: it.code,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      subtotal: it.subtotal
    })),
    coupon: o.coupon || null,
    delivery: o.delivery || null,
    createdAt,
    updatedAt
  };
}

// GET /api/mis-compras
// Query params opcionales:
//   status=ESTADO
//   page=1
//   limit=10
//   userId= <solo admin para ver otro usuario>
exports.getMisCompras = async (req, res) => {
  try {
    const uid = req.userId;
    if (!isValidObjectId(uid)) return res.status(400).json({ message: 'ID inválido' });

    const me = await User.findById(uid).populate('roles').lean();
    if (!me) return res.status(401).json({ message: 'No autenticado' });
    const isAdmin = (me.roles || []).some(r => r.name === 'admin');

    const { status } = req.query;
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '10', 10);
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    const filter = {};
    if (status) filter.status = status;

    if (isAdmin && req.query.userId && isValidObjectId(req.query.userId)) {
      filter.user = req.query.userId;
    } else {
      filter.user = uid;
    }

    const skip = (page - 1) * limit;

    const [total, orders, agg] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const resumenEstados = {
      PENDIENTE_DE_PAGO: 0,
      PAGADO: 0,
      RECHAZADO: 0,
      ERROR_PASARELA: 0
    };
    agg.forEach(r => { resumenEstados[r._id] = r.count; });

    return res.json({
      usuario: uid,
      filtros: { status: status || null },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      resumenEstados,
      compras: orders.map(mapOrder)
    });
  } catch (err) {
    console.error('getMisCompras error:', err);
    return res.status(500).json({ message: 'Error obteniendo compras' });
  }
};