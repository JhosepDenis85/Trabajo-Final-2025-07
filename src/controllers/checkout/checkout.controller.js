const mongoose = require('mongoose');
const Cart = require('../../models/cart.model');
const Product = require('../../models/product.model');
const Category = require('../../models/category.model');
const Coupon = require('../../models/coupon.model');
const User = require('../../models/user.model');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function calcSummary(cartDoc) {
  const items = cartDoc.items || [];
  const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  let discount = 0;

  if (cartDoc.coupon && cartDoc.coupon.active) {
    if (!cartDoc.coupon.minSubtotal || subtotal >= cartDoc.coupon.minSubtotal) {
      if (cartDoc.coupon.type === 'percent') {
        discount = +(subtotal * (Number(cartDoc.coupon.value || 0) / 100)).toFixed(2);
      } else if (cartDoc.coupon.type === 'amount') {
        discount = Math.min(subtotal, Number(cartDoc.coupon.value || 0));
      }
    }
  }

  const shipping = Number(cartDoc.delivery?.cost || 0);
  const total = Math.max(0, +(subtotal - discount + shipping).toFixed(2));

  return {
    items,
    subtotal: +subtotal.toFixed(2),
    discount: +discount.toFixed(2),
    shipping: +shipping.toFixed(2),
    total
  };
}

async function ensureOwner(req, res) {
  try {
    const paramUserId = String(req.params.userId);
    const me = await User.findById(req.userId).populate('roles').exec();
    if (!me) return res.status(401).json({ message: 'No autenticado' });

    const isAdmin = (me.roles || []).some(r => r.name === 'admin');
    if (isAdmin) return { ok: true };

    if (String(req.userId) !== paramUserId) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    return { ok: true };
  } catch (err) {
    return res.status(500).json({ message: 'Error de autorización' });
  }
}

exports.getItems = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const cart = await Cart.getOrCreate(req.params.userId);
    const summary = calcSummary(cart);
    return res.json({ userId: req.params.userId, ...summary });
  } catch (err) {
    console.error('getItems error:', err);
    return res.status(500).json({ message: 'Error obteniendo carrito' });
  }
};

exports.addOrUpdateItem = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const { productId, code, quantity = 1 } = req.body || {};
    if ((!productId && !code) || !Number.isFinite(Number(quantity)) || quantity <= 0) {
      return res.status(400).json({ message: 'productId o code y quantity válidos son requeridos' });
    }

    let product = null;
    if (productId && isValidObjectId(productId)) {
      product = await Product.findById(productId).populate('category').exec();
    } else if (code) {
      product = await Product.findOne({ code }).populate('category').exec();
    }
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    const cart = await Cart.getOrCreate(req.params.userId);

    const idx = cart.items.findIndex(it => String(it.product) === String(product._id));
    const price = Number(product.price || 0);
    const qty = Number(quantity);

    if (idx >= 0) {
      cart.items[idx].quantity = qty;
      cart.items[idx].price = price;
      cart.items[idx].subtotal = +(price * qty).toFixed(2);
    } else {
      cart.items.push({
        product: product._id,
        category: product.category?._id || product.category,
        code: product.code,
        name: product.name,
        brand: product.brand,
        price,
        quantity: qty,
        subtotal: +(price * qty).toFixed(2)
      });
    }

    await cart.save();
    const summary = calcSummary(cart);
    return res.status(201).json({ message: 'Item agregado/actualizado', ...summary });
  } catch (err) {
    console.error('addOrUpdateItem error:', err);
    return res.status(500).json({ message: 'Error agregando/actualizando item' });
  }
};

exports.removeItem = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const { itemId } = req.params;
    const cart = await Cart.getOrCreate(req.params.userId);
    const before = cart.items.length;
    cart.items = cart.items.filter(it => String(it._id) !== String(itemId));
    if (cart.items.length === before) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    await cart.save();
    const summary = calcSummary(cart);
    return res.json({ message: 'Item eliminado', ...summary });
  } catch (err) {
    console.error('removeItem error:', err);
    return res.status(500).json({ message: 'Error eliminando item' });
  }
};

exports.validateCoupon = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'code requerido' });

    const cart = await Cart.getOrCreate(req.params.userId);
    const coupon = await Coupon.findOne({ code }).exec();
    if (!coupon || coupon.active === false) {
      return res.status(404).json({ message: 'Cupón inválido o inactivo' });
    }

    const subtotal = cart.items.reduce((a, it) => a + (it.price * it.quantity), 0);
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return res.status(400).json({ message: 'No cumple monto mínimo' });
    }

    cart.coupon = {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minSubtotal: coupon.minSubtotal,
      active: coupon.active !== false
    };
    await cart.save();

    const summary = calcSummary(cart);
    return res.json({ message: 'Cupón aplicado', coupon: cart.coupon, ...summary });
  } catch (err) {
    console.error('validateCoupon error:', err);
    return res.status(500).json({ message: 'Error validando cupón' });
  }
};

exports.setDelivery = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const { type = 'pickup', address = '', schedule = '' } = req.body || {};
    if (!['delivery', 'pickup'].includes(type)) {
      return res.status(400).json({ message: 'type inválido' });
    }

    const cart = await Cart.getOrCreate(req.params.userId);
    const cost = type === 'delivery' ? 8.0 : 0;

    cart.delivery = { type, address, schedule, cost };
    await cart.save();

    const summary = calcSummary(cart);
    return res.json({ message: 'Método de entrega actualizado', delivery: cart.delivery, ...summary });
  } catch (err) {
    console.error('setDelivery error:', err);
    return res.status(500).json({ message: 'Error actualizando entrega' });
  }
};

exports.getPaymentMethods = async (_req, res) => {
  try {
    return res.json([
      { id: 'card', name: 'Tarjeta crédito/débito', provider: 'Stripe', available: true },
      { id: 'cash_on_delivery', name: 'Efectivo contra entrega', available: true }
    ]);
  } catch (err) {
    return res.status(500).json({ message: 'Error listando métodos de pago' });
  }
};

exports.setPayment = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const { method } = req.body || {};
    if (!['card', 'cash_on_delivery'].includes(method)) {
      return res.status(400).json({ message: 'Método de pago inválido' });
    }
    const cart = await Cart.getOrCreate(req.params.userId);
    cart.payment = { method };
    await cart.save();

    const summary = calcSummary(cart);
    return res.json({ message: 'Método de pago actualizado', payment: cart.payment, ...summary });
  } catch (err) {
    console.error('setPayment error:', err);
    return res.status(500).json({ message: 'Error guardando método de pago' });
  }
};

exports.getSummary = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;

  try {
    const cart = await Cart.getOrCreate(req.params.userId);
    const summary = calcSummary(cart);
    return res.json({
      userId: req.params.userId,
      delivery: cart.delivery || { type: 'pickup', cost: 0 },
      payment: cart.payment || { method: 'card' },
      coupon: cart.coupon || null,
      ...summary
    });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({ message: 'Error obteniendo resumen' });
  }
};