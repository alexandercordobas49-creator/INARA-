export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const f of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, f) || req.body[f] === undefined || req.body[f] === null || req.body[f] === '') {
        missing.push(f);
      }
    }
    if (missing.length) {
      return res.status(400).json({ message: `Faltan campos: ${missing.join(', ')}` });
    }
    next();
  };
}
