const mongoose = require('mongoose');
const { createPaymentIntent, retrievePaymentIntent } = require('../../config/stripe');
const Cart = require('../../models/cart.model');
const Order = require('../../models/order.model');
const User = require('../../models/user.model');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function calcSummary(cartDoc) {
  const items = cartDoc.items || [];
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  let discount = 0;
  const coupon = cartDoc.coupon;
  if (coupon && coupon.active) {
    if (!coupon.minSubtotal || subtotal >= coupon.minSubtotal) {
      if (coupon.type === 'percent') {
        discount = +(subtotal * (Number(coupon.value || 0) / 100)).toFixed(2);
      } else if (coupon.type === 'amount') {
        discount = Math.min(subtotal, Number(coupon.value || 0));
      }
    }
  }
  const shipping = Number(cartDoc.delivery?.cost || 0);
  const total = Math.max(0, +(subtotal - discount + shipping).toFixed(2));
  return { items, subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), shipping: +shipping.toFixed(2), total };
}

async function ensureOwner(req, res) {
  try {
    const paramUserId = String(req.params.userId);
    if (!isValidObjectId(paramUserId)) return res.status(400).json({ message: 'userId inválido' });
    const me = await User.findById(req.userId).populate('roles').exec();
    if (!me) return res.status(401).json({ message: 'No autenticado' });
    const isAdmin = (me.roles || []).some(r => r.name === 'admin');
    if (isAdmin || String(req.userId) === paramUserId) return { ok: true };
    return res.status(403).json({ message: 'Acceso denegado' });
  } catch {
    return res.status(500).json({ message: 'Error autorizando' });
  }
}

exports.getCartForPayment = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;
  try {
    const cart = await Cart.getOrCreate(req.params.userId);
    const summary = calcSummary(cart);
    if (!summary.items.length) return res.status(400).json({ message: 'Carrito vacío' });

    let draft = await Order.findOne({ user: req.params.userId, status: 'PENDIENTE_DE_PAGO' });
    if (!draft) {
      draft = await Order.create({
        user: req.params.userId,
        cart: cart._id,
        draftId: Order.generateDraftId(),
        status: 'PENDIENTE_DE_PAGO',
        items: summary.items.map(it => ({
          product: it.product,
          code: it.code,
          name: it.name,
          brand: it.brand,
          price: it.price,
          quantity: it.quantity,
          subtotal: it.price * it.quantity,
          category: it.category
        })),
        subtotal: summary.subtotal,
        discount: summary.discount,
        shipping: summary.shipping,
        total: summary.total,
        coupon: cart.coupon || null,
        delivery: cart.delivery || null,
        payment: cart.payment || null
      });
    } else {
      draft.items = summary.items.map(it => ({
        product: it.product,
        code: it.code,
        name: it.name,
        brand: it.brand,
        price: it.price,
        quantity: it.quantity,
        subtotal: it.price * it.quantity,
        category: it.category
      }));
      draft.subtotal = summary.subtotal;
      draft.discount = summary.discount;
      draft.shipping = summary.shipping;
      draft.total = summary.total;
      draft.coupon = cart.coupon || null;
      draft.delivery = cart.delivery || null;
      draft.payment = cart.payment || null;
      await draft.save();
    }

    return res.json({
      orderDraftId: draft.draftId,
      productos: draft.items,
      subtotal: draft.subtotal,
      descuentos: draft.discount,
      envio: draft.shipping,
      totalPagar: draft.total,
      estado: draft.status
    });
  } catch (err) {
    console.error('getCartForPayment error:', err);
    return res.status(500).json({ message: 'Error preparando carrito para pago' });
  }
};

exports.processPayment = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;
  try {
    const { orderDraftId, metodoPago = 'TARJETA', email } = req.body || {};
    if (!orderDraftId) return res.status(400).json({ message: 'orderDraftId requerido' });
    const order = await Order.findOne({ draftId: orderDraftId, user: req.params.userId });
    if (!order || order.status !== 'PENDIENTE_DE_PAGO') return res.status(404).json({ message: 'Draft no encontrado o inválido' });

    const paymentIntent = await createPaymentIntent(order.total, {
      draftId: order.draftId,
      userId: order.user.toString(),
      metodoPago
    });

    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    return res.json({
      orderDraftId: order.draftId,
      clientSecret: paymentIntent.client_secret,
      total: order.total,
      currency: 'PEN',
      emailHint: email || null
    });
  } catch (err) {
    console.error('processPayment error:', err);
    return res.status(500).json({ message: 'Error creando intento de pago' });
  }
};

exports.changeStatus = async (req, res) => {
  const auth = await ensureOwner(req, res);
  if (!auth?.ok) return;
  try {
    const { orderDraftId, nuevoEstado } = req.body || {};
    if (!orderDraftId || !nuevoEstado) return res.status(400).json({ message: 'orderDraftId y nuevoEstado requeridos' });
    const order = await Order.findOne({ draftId: orderDraftId, user: req.params.userId });
    if (!order) return res.status(404).json({ message: 'Draft no encontrado' });

    if (nuevoEstado === 'PAGADO') {
      if (!order.stripePaymentIntentId) return res.status(400).json({ message: 'Sin PaymentIntent' });
      const pi = await retrievePaymentIntent(order.stripePaymentIntentId);
      if (pi.status !== 'succeeded') return res.status(409).json({ message: `PaymentIntent no confirmado: ${pi.status}` });
      order.status = 'PAGADO';
      order.orderId = `ORDER-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*10000)}`;
      await order.save();
      return res.json({ orderId: order.orderId, estado: order.status, mensaje: 'Pago validado.' });
    }
    if (['RECHAZADO', 'ERROR_PASARELA'].includes(nuevoEstado)) {
      order.status = nuevoEstado;
      await order.save();
      return res.json({ estado: order.status, mensaje: 'Estado actualizado.' });
    }
    return res.status(400).json({ message: 'Estado inválido' });
  } catch (err) {
    console.error('changeStatus error:', err);
    return res.status(500).json({ message: 'Error cambiando estado' });
  }
};