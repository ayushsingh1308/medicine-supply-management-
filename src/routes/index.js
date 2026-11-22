const router = require('express').Router();
const validate = require('../middleware/validate');
const med = require('../controllers/medicine.controller');
const sup = require('../controllers/supplier.controller');
const ord = require('../controllers/order.controller');
const chat = require('../controllers/chat.controller');

// Medicines (static paths first so they are not captured by /:id)
router.get('/medicines/alerts/low-stock', med.lowStock);
router.get('/medicines/alerts/expiring', med.expiring);
router.get('/medicines', validate(med.listQuerySchema, 'query'), med.list);
router.post('/medicines', validate(med.createSchema), med.create);
router.get('/medicines/:id', med.get);
router.patch('/medicines/:id', validate(med.updateSchema), med.update);
router.delete('/medicines/:id', med.remove);
router.post('/medicines/:id/stock', validate(med.stockSchema), med.adjustStock);
router.get('/medicines/:id/movements', med.movements);
router.get('/medicines/:id/alternatives', med.alternatives);

// Suppliers
router.get('/suppliers', sup.list);
router.post('/suppliers', validate(sup.createSchema), sup.create);
router.get('/suppliers/:id', sup.get);
router.patch('/suppliers/:id', validate(sup.updateSchema), sup.update);
router.get('/suppliers/:id/catalog', sup.catalog);

// Purchase orders
router.get('/orders', ord.list);
router.post('/orders', validate(ord.createSchema), ord.create);
router.get('/orders/:id', ord.get);
router.patch('/orders/:id/receive', ord.receive);
router.patch('/orders/:id/cancel', ord.cancel);

// AI chatbot
router.post('/chat', validate(chat.schema), chat.chat);

module.exports = router;
