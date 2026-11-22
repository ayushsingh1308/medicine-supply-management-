const { Schema, model } = require('mongoose');

// Append-only audit log of every stock change.
const stockMovementSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUST', 'EXPIRED'], required: true },
    quantity: { type: Number, required: true }, // signed delta
    balanceAfter: { type: Number, required: true },
    reason: { type: String, trim: true },
    reference: { type: String, trim: true }, // e.g. purchase order id
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ medicine: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

module.exports = model('StockMovement', stockMovementSchema);
