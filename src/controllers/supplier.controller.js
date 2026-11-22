const { z } = require('zod');
const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.createSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  active: z.boolean().optional(),
});
exports.updateSchema = exports.createSchema.partial();

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.active ? { active: req.query.active === 'true' } : {};
  res.json(await Supplier.find(filter).sort({ rating: -1, name: 1 }).lean());
});

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Supplier.create(req.body)));

exports.get = asyncHandler(async (req, res) => {
  const s = await Supplier.findById(req.params.id);
  if (!s) throw new ApiError(404, 'Supplier not found');
  res.json(s);
});

exports.update = asyncHandler(async (req, res) => {
  const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!s) throw new ApiError(404, 'Supplier not found');
  res.json(s);
});

// Everything a supplier can provide (uses the suppliers.supplier index)
exports.catalog = asyncHandler(async (req, res) => {
  const meds = await Medicine.find({ 'suppliers.supplier': req.params.id }, 'name genericName strength form suppliers.$').lean();
  res.json(
    meds.map((m) => ({
      medicine: m.name,
      genericName: m.genericName,
      strength: m.strength,
      form: m.form,
      unitPrice: m.suppliers[0].unitPrice,
      leadTimeDays: m.suppliers[0].leadTimeDays,
      available: m.suppliers[0].available,
    }))
  );
});
