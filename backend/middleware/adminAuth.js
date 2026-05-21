module.exports = function (req, res, next) {
  const provided = req.header('X-Admin-Key');
  if (!provided || provided !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Admin key inválida ou ausente.' });
  }
  next();
};
