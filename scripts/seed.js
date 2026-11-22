require('dotenv').config();
const mongoose = require('mongoose');
const Supplier = require('../src/models/Supplier');
const Medicine = require('../src/models/Medicine');
const StockMovement = require('../src/models/StockMovement');

const days = (n) => new Date(Date.now() + n * 86400000);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Supplier.deleteMany({}), Medicine.deleteMany({}), StockMovement.deleteMany({})]);
  await Promise.all([Supplier.syncIndexes(), Medicine.syncIndexes(), StockMovement.syncIndexes()]);

  const [sunrise, medline, apex] = await Supplier.insertMany([
    { name: 'Sunrise Pharma Distributors', contactEmail: 'orders@sunrisepharma.example', city: 'Chennai', rating: 4.6 },
    { name: 'MedLine Wholesale', contactEmail: 'sales@medline.example', city: 'Bengaluru', rating: 4.2 },
    { name: 'Apex Healthcare Supplies', contactEmail: 'hello@apexhealth.example', city: 'Hyderabad', rating: 3.9 },
  ]);

  const offer = (s, unitPrice, leadTimeDays, available = true) => ({ supplier: s._id, unitPrice, leadTimeDays, available });

  const meds = [
    { name: 'Dolo 650', genericName: 'paracetamol', sku: 'PAR-650-DOLO', category: 'Analgesic', form: 'tablet', strength: '650mg', manufacturer: 'Micro Labs', price: 2.9, quantityInStock: 500, reorderLevel: 100, expiryDate: days(400), suppliers: [offer(sunrise, 2.1, 2), offer(medline, 2.3, 3)] },
    { name: 'Calpol 650', genericName: 'paracetamol', sku: 'PAR-650-CALP', category: 'Analgesic', form: 'tablet', strength: '650mg', manufacturer: 'GSK', price: 3.2, quantityInStock: 240, reorderLevel: 100, expiryDate: days(300), suppliers: [offer(medline, 2.5, 3)] },
    { name: 'Crocin 650', genericName: 'paracetamol', sku: 'PAR-650-CROC', category: 'Analgesic', form: 'tablet', strength: '650mg', manufacturer: 'GSK', price: 3.0, quantityInStock: 0, reorderLevel: 100, expiryDate: days(250), suppliers: [offer(sunrise, 2.4, 2), offer(apex, 2.2, 5, false)] },
    { name: 'Augmentin 625', genericName: 'amoxicillin + clavulanic acid', sku: 'AMX-625-AUG', category: 'Antibiotic', form: 'tablet', strength: '625mg', manufacturer: 'GSK', price: 22.0, quantityInStock: 35, reorderLevel: 50, expiryDate: days(45), suppliers: [offer(medline, 17.5, 4), offer(apex, 18.0, 6)] },
    { name: 'Clavam 625', genericName: 'amoxicillin + clavulanic acid', sku: 'AMX-625-CLAV', category: 'Antibiotic', form: 'tablet', strength: '625mg', manufacturer: 'Alkem', price: 19.5, quantityInStock: 180, reorderLevel: 50, expiryDate: days(500), suppliers: [offer(sunrise, 15.0, 2)] },
    { name: 'Pantocid 40', genericName: 'pantoprazole', sku: 'PAN-40-PCID', category: 'Antacid', form: 'tablet', strength: '40mg', manufacturer: 'Sun Pharma', price: 9.5, quantityInStock: 320, reorderLevel: 80, expiryDate: days(380), suppliers: [offer(sunrise, 7.0, 2)] },
    { name: 'Pan 40', genericName: 'pantoprazole', sku: 'PAN-40-PAN', category: 'Antacid', form: 'tablet', strength: '40mg', manufacturer: 'Alkem', price: 8.8, quantityInStock: 60, reorderLevel: 80, expiryDate: days(210), suppliers: [offer(medline, 6.5, 3)] },
    { name: 'Cetzine 10', genericName: 'cetirizine', sku: 'CET-10-CZ', category: 'Antihistamine', form: 'tablet', strength: '10mg', manufacturer: 'GSK', price: 1.8, quantityInStock: 900, reorderLevel: 150, expiryDate: days(600), suppliers: [offer(apex, 1.1, 5)] },
    { name: 'Benadryl Cough Syrup', genericName: 'diphenhydramine', sku: 'DIP-SYR-BEN', category: 'Cough & Cold', form: 'syrup', strength: '150ml', manufacturer: 'J&J', price: 98.0, quantityInStock: 25, reorderLevel: 30, expiryDate: days(30), suppliers: [offer(medline, 80.0, 3)] },
    { name: 'Insulin Glargine Pen', genericName: 'insulin glargine', sku: 'INS-GLA-PEN', category: 'Antidiabetic', form: 'injection', strength: '100IU/ml', manufacturer: 'Sanofi', price: 780.0, quantityInStock: 12, reorderLevel: 10, expiryDate: days(120), suppliers: [offer(apex, 700.0, 7)] },
  ];

  for (const m of meds) await new Medicine(m).save(); // save() so the pre-save lowStock hook runs
  console.log(`Seeded ${await Supplier.countDocuments()} suppliers and ${await Medicine.countDocuments()} medicines`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
