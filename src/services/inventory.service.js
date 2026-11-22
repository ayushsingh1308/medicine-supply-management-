const Medicine = require('../models/Medicine');
const StockMovement = require('../models/StockMovement');
const ApiError = require('../utils/ApiError');
const bus = require('../utils/events');
const escapeRegex = require('../utils/escapeRegex');

/**
 * Atomically change stock by `delta` (positive = receive, negative = dispense).
 * The filter guarantees stock can never go negative even under concurrent requests,
 * and the aggregation-pipeline update recomputes the lowStock flag in the same write.
 */
async function adjustStock(medicineId, delta, { type, reason, reference } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw new ApiError(400, 'delta must be a non-zero integer');

  const filter = { _id: medicineId };
  if (delta < 0) filter.quantityInStock = { $gte: -delta };

  const updated = await Medicine.findOneAndUpdate(
    filter,
    [
      { $set: { quantityInStock: { $add: ['$quantityInStock', delta] } } },
      { $set: { lowStock: { $lte: ['$quantityInStock', '$reorderLevel'] } } },
    ],
    { new: true }
  );

  if (!updated) {
    const exists = await Medicine.exists({ _id: medicineId });
    throw exists ? new ApiError(409, 'Insufficient stock') : new ApiError(404, 'Medicine not found');
  }

  await StockMovement.create({
    medicine: updated._id,
    type: type || (delta > 0 ? 'IN' : 'OUT'),
    quantity: delta,
    balanceAfter: updated.quantityInStock,
    reason,
    reference,
  });

  bus.emit('stock:updated', { id: updated._id, name: updated.name, quantityInStock: updated.quantityInStock });
  if (updated.lowStock) {
    bus.emit('stock:low', {
      id: updated._id,
      name: updated.name,
      quantityInStock: updated.quantityInStock,
      reorderLevel: updated.reorderLevel,
    });
  }
  return updated;
}

/** Matches a free-text drug name against brand or generic name. */
async function findByName(query) {
  const rx = new RegExp(escapeRegex(query.trim()), 'i');
  return Medicine.find({ $or: [{ name: rx }, { genericName: rx }] })
    .populate('suppliers.supplier', 'name city rating active')
    .limit(10);
}

/** Same generic + form (+ strength when known), in stock, cheapest first. */
async function findAlternatives(medicine) {
  const filter = {
    _id: { $ne: medicine._id },
    genericName: medicine.genericName,
    form: medicine.form,
    quantityInStock: { $gt: 0 },
  };
  if (medicine.strength) filter.strength = medicine.strength;
  return Medicine.find(filter).sort({ price: 1 }).limit(10);
}

async function lowStockReport(limit = 50) {
  return Medicine.find({ lowStock: true }).sort({ quantityInStock: 1 }).limit(limit);
}

async function expiringSoon(days = 60) {
  const cutoff = new Date(Date.now() + days * 86400000);
  return Medicine.find({ expiryDate: { $lte: cutoff }, quantityInStock: { $gt: 0 } }).sort({ expiryDate: 1 });
}

module.exports = { adjustStock, findByName, findAlternatives, lowStockReport, expiringSoon };
