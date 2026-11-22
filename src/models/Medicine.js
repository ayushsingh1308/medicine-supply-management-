const { Schema, model } = require('mongoose');

const supplierOfferSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    unitPrice: { type: Number, min: 0, required: true },
    leadTimeDays: { type: Number, min: 0, default: 3 },
    available: { type: Boolean, default: true },
  },
  { _id: false }
);

const medicineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // brand name e.g. "Dolo 650"
    genericName: { type: String, required: true, trim: true, lowercase: true }, // e.g. "paracetamol"
    sku: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    form: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'other'], default: 'tablet' },
    strength: { type: String, trim: true }, // e.g. "500mg"
    manufacturer: { type: String, trim: true },
    price: { type: Number, min: 0, required: true },
    quantityInStock: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 20 },
    lowStock: { type: Boolean, default: false }, // denormalised flag so it can be indexed
    expiryDate: { type: Date },
    suppliers: { type: [supplierOfferSchema], default: [] },
  },
  { timestamps: true }
);

// Keep the denormalised flag in sync on create / save.
medicineSchema.pre('save', function (next) {
  this.lowStock = this.quantityInStock <= this.reorderLevel;
  next();
});

/* ---------------- Indexes ----------------
 * Each index maps to a concrete query path in the API / chatbot.
 */
medicineSchema.index({ sku: 1 }, { unique: true }); // SKU lookups + uniqueness
medicineSchema.index({ name: 'text', genericName: 'text' }, { weights: { name: 5, genericName: 3 } }); // search
medicineSchema.index({ genericName: 1, form: 1, strength: 1, price: 1 }); // drug alternatives (equality + sort)
medicineSchema.index({ lowStock: 1, quantityInStock: 1 }); // low-stock dashboard
medicineSchema.index({ expiryDate: 1 }); // expiring-soon report
medicineSchema.index({ category: 1, name: 1 }); // category browsing
medicineSchema.index({ 'suppliers.supplier': 1 }); // "what does supplier X provide?"

module.exports = model('Medicine', medicineSchema);
