const { Schema, model, Types } = require('mongoose');

const ProductSchema = new Schema(
  {
    category: { type: Types.ObjectId, ref: 'Category', required: true },
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PEN' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ProductSchema.index({ code: 1 }, { unique: true });
ProductSchema.index({ name: 'text', brand: 'text' });

module.exports = model('Product', ProductSchema);