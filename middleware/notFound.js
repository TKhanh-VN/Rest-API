module.exports = function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: "Endpoint not found",
    data: {
      path: req.originalUrl,
      method: req.method
    }
  });
};
