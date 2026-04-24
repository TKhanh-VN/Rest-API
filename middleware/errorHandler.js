function errorHandler({ logger }) {
  return function (err, req, res, next) {
    logger.error("Unhandled server error", {
      error: err.message,
      path: req.originalUrl
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null
    });
  };
}

module.exports = errorHandler;
