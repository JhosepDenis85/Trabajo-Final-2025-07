const { Schema, model } = require('mongoose');

const CartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    items: { type: [CartItemSchema], default: [] },
    coupon: {
      code: String,
      type: { type: String, enum: ['percent', 'amount'] },
      value: Number,
      minSubtotal: Number,
      active: Boolean
    },
    delivery: {
      type: { type: String, enum: ['delivery', 'pickup'], default: 'pickup' },
      address: String,
      schedule: String,
      cost: { type: Number, default: 0 }
    },
    payment: {
      method: { type: String, enum: ['card', 'cash_on_delivery'], default: 'card' }
    }
  },
  { timestamps: true }
);

CartSchema.statics.getOrCreate = async function (userId) {
  let cart = await this.findOne({ user: userId });
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }
  return cart;
};

module.exports = model('Cart', CartSchema);