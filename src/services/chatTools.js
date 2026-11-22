// Tools the chatbot can call. They read live data from MongoDB so answers are never made up.
const inventory = require('./inventory.service');

const summarise = (m) => ({
  name: m.name,
  genericName: m.genericName,
  strength: m.strength,
  form: m.form,
  price: m.price,
  quantityInStock: m.quantityInStock,
  lowStock: m.lowStock,
  expiryDate: m.expiryDate,
});

const nameSchema = {
  type: 'object',
  properties: { name: { type: 'string', description: 'Brand or generic name' } },
  required: ['name'],
};

const definitions = [
  { name: 'check_stock', description: 'Check current stock level, price and expiry for a medicine by brand or generic name.', input_schema: nameSchema },
  { name: 'find_alternatives', description: 'Find in-stock alternatives with the same generic ingredient, form and strength, cheapest first.', input_schema: nameSchema },
  { name: 'find_suppliers', description: 'List suppliers for a medicine with unit price, lead time and availability.', input_schema: nameSchema },
  { name: 'low_stock_report', description: 'List medicines at or below their reorder level.', input_schema: { type: 'object', properties: {} } },
  {
    name: 'expiring_soon',
    description: 'List in-stock medicines expiring within N days (default 60).',
    input_schema: { type: 'object', properties: { days: { type: 'integer' } } },
  },
];

const handlers = {
  async check_stock({ name }) {
    const meds = await inventory.findByName(name);
    return meds.length ? meds.map(summarise) : { message: `No medicine found matching "${name}"` };
  },

  async find_alternatives({ name }) {
    const [med] = await inventory.findByName(name);
    if (!med) return { message: `No medicine found matching "${name}"` };
    const alts = await inventory.findAlternatives(med);
    return { requested: summarise(med), alternatives: alts.map(summarise) };
  },

  async find_suppliers({ name }) {
    const [med] = await inventory.findByName(name);
    if (!med) return { message: `No medicine found matching "${name}"` };
    return {
      medicine: med.name,
      suppliers: med.suppliers
        .filter((s) => s.supplier)
        .map((s) => ({
          supplier: s.supplier.name,
          city: s.supplier.city,
          rating: s.supplier.rating,
          unitPrice: s.unitPrice,
          leadTimeDays: s.leadTimeDays,
          available: s.available && s.supplier.active,
        })),
    };
  },

  async low_stock_report() {
    return (await inventory.lowStockReport(20)).map(summarise);
  },

  async expiring_soon({ days } = {}) {
    return (await inventory.expiringSoon(days || 60)).map(summarise);
  },
};

async function runTool(name, input) {
  const fn = handlers[name];
  if (!fn) return { error: `Unknown tool ${name}` };
  try {
    return await fn(input || {});
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { definitions, runTool };
