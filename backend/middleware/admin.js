function requireAdmin(req, res, next) {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
}

module.exports = {
  requireAdmin
};