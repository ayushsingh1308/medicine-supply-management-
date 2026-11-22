const { Schema, model } = require('mongoose');

const itemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, min: 1, required: true },
    unitPrice: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: ['PLACED', 'RECEIVED', 'CANCELLED'], default: 'PLACED' },
    expectedDate: { type: Date },
    receivedAt: { type: Date },
    totalAmount: { type: Number, min: 0 },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre('save', function (next) {
  this.totalAmount = this.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  next();
});

purchaseOrderSchema.index({ supplier: 1, status: 1, createdAt: -1 });
purchaseOrderSchema.index({ status: 1, expectedDate: 1 });

module.exports = model('PurchaseOrder', purchaseOrderSchema);
