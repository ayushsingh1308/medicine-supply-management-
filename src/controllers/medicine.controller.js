const { z } = require('zod');
const Medicine = require('../models/Medicine');
const StockMovement = require('../models/StockMovement');
const inventory = require('../services/inventory.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'other'];
const offer = z.object({
  supplier: z.string().length(24),
  unitPrice: z.number().min(0),
  leadTimeDays: z.number().int().min(0).optional(),
  available: z.boolean().optional(),
});

exports.createSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  form: z.enum(FORMS).optional(),
  strength: z.string().optional(),
  manufacturer: z.string().optional(),
  price: z.number().min(0),
  quantityInStock: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  expiryDate: z.coerce.date().optional(),
  suppliers: z.array(offer).optional(),
});
exports.updateSchema = exports.createSchema.partial().omit({ quantityInStock: true }); // stock only via /stock

exports.listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

exports.stockSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, 'delta must be non-zero'),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'EXPIRED']).optional(),
  reason: z.string().optional(),
});

exports.list = asyncHandler(async (req, res) => {
  const { q, category, lowStock, page, limit } = req.validQuery;
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (lowStock) filter.lowStock = lowStock === 'true';

  const projection = q ? { score: { $meta: 'textScore' } } : {};
  const sort = q ? { score: { $meta: 'textScore' } } : { name: 1 };

  const [items, total] = await Promise.all([
    Medicine.find(filter, projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Medicine.countDocuments(filter),
  ]);
  res.json({ page, limit, total, items });
});

exports.create = asyncHandler(async (req, res) => {
  const med = await Medicine.create(req.body);
  res.status(201).json(med);
});

exports.get = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id).populate('suppliers.supplier', 'name city rating active');
  if (!med) throw new ApiError(404, 'Medicine not found');
  res.json(med);
});

exports.update = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Medicine not found');
  med.set(req.body);
  await med.save(); // re-runs pre-save hook so lowStock stays correct if reorderLevel changed
  res.json(med);
});

exports.remove = asyncHandler(async (req, res) => {
  const med = await Medicine.findByIdAndDelete(req.params.id);
  if (!med) throw new ApiError(404, 'Medicine not found');
  res.status(204).end();
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const { delta, type, reason } = req.body;
  const med = await inventory.adjustStock(req.params.id, delta, { type, reason });
  res.json(med);
});

exports.movements = asyncHandler(async (req, res) => {
  const items = await StockMovement.find({ medicine: req.params.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(items);
});

exports.alternatives = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Medicine not found');
  res.json(await inventory.findAlternatives(med));
});

exports.lowStock = asyncHandler(async (req, res) => res.json(await inventory.lowStockReport()));

exports.expiring = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 60, 365);
  res.json(await inventory.expiringSoon(days));
});
