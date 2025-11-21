const { Schema, model } = require('mongoose');

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    code: String,
    name: String,
    brand: String,
    price: Number,
    quantity: Number,
    subtotal: Number,
    category: { type: Schema.Types.ObjectId, ref: 'Category' }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cart: { type: Schema.Types.ObjectId, ref: 'Cart', required: true },
    draftId: { type: String, unique: true, required: true },
    orderId: { type: String },
    status: {
      type: String,
      enum: [
        'PENDIENTE_DE_PAGO',
        'PAGO_PROCESADO',
        'PAGADO',
        'RECHAZADO',
        'ERROR_PASARELA'
      ],
      default: 'PENDIENTE_DE_PAGO'
    },
    items: [OrderItemSchema],
    subtotal: Number,
    discount: Number,
    shipping: Number,
    total: Number,
    coupon: {
      code: String,
      type: String,
      value: Number,
      minSubtotal: Number,
      active: Boolean
    },
    delivery: {
      type: { type: String },
      address: String,
      schedule: String,
      cost: Number
    },
    payment: {
      method: String
    },
    stripePaymentIntentId: String,
    authorizationCode: String,
    transactionId: String
  },
  { timestamps: true }
);

OrderSchema.statics.generateDraftId = function () {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

module.exports = model('Order', OrderSchema);