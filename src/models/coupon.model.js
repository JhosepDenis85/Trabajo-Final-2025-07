const { Schema, model } = require('mongoose');

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'amount'], required: true },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date },
    validTo: { type: Date },
    active: { type: Boolean, default: true },
    maxUses: { type: Number }, // opcional
    uses: { type: Number, default: 0 }
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1 }, { unique: true });

module.exports = model('Coupon', CouponSchema);