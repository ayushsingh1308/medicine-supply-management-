// validate(schema, 'body' | 'query') -> parsed + coerced data replaces req[source]
module.exports = (schema, source = 'body') => (req, res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    if (source === 'query') req.validQuery = parsed;
    else req[source] = parsed;
    next();
  } catch (err) {
    next(err);
  }
};
