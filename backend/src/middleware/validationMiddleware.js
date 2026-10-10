export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
        missing.push(field);
        continue;
      }

      const value = req.body[field];
      if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length) {
      return res.status(400).json({ message: `Faltan campos: ${missing.join(', ')}` });
    }

    return next();
  };
}
