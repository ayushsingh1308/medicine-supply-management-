const { z } = require('zod');
const PurchaseOrder = require('../models/PurchaseOrder');
const inventory = require('../services/inventory.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.createSchema = z.object({
  supplier: z.string().length(24),
  expectedDate: z.coerce.date().optional(),
  items: z
    .array(z.object({ medicine: z.string().length(24), quantity: z.number().int().min(1), unitPrice: z.number().min(0) }))
    .min(1),
});

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.supplier) filter.supplier = req.query.supplier;
  res.json(await PurchaseOrder.find(filter).populate('supplier', 'name').sort({ createdAt: -1 }).limit(100).lean());
});

exports.create = asyncHandler(async (req, res) => res.status(201).json(await PurchaseOrder.create(req.body)));

exports.get = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name').populate('items.medicine', 'name sku');
  if (!po) throw new ApiError(404, 'Order not found');
  res.json(po);
});

// Receiving an order adds each line to stock and logs a stock movement.
exports.receive = asyncHandler(async (req, res) => {
  // Atomically claim the order so it cannot be received twice.
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, status: 'PLACED' },
    { status: 'RECEIVED', receivedAt: new Date() },
    { new: true }
  );
  if (!po) throw new ApiError(409, 'Order not found or not in PLACED status');

  for (const item of po.items) {
    await inventory.adjustStock(item.medicine, item.quantity, { type: 'IN', reason: 'Purchase order received', reference: String(po._id) });
  }
  res.json(po);
});

exports.cancel = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, status: 'PLACED' }, { status: 'CANCELLED' }, { new: true });
  if (!po) throw new ApiError(409, 'Order not found or not in PLACED status');
  res.json(po);
});
