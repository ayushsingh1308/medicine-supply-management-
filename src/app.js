const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSP off so the demo UI can load Socket.IO client
app.use(cors());
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 20 })); // chatbot calls cost money

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api', routes);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
