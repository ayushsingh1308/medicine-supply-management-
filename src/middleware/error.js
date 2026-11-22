const { ZodError } = require('zod');

exports.notFound = (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate value', details: err.keyValue });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });

  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message, details: err.details });
};
