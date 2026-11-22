const { Schema, model } = require('mongoose');

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 3 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 }, { unique: true });
supplierSchema.index({ active: 1, rating: -1 });

module.exports = model('Supplier', supplierSchema);
