module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para continuar",
    });
  }

  return next();
};
