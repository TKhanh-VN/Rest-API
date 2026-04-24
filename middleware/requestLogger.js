function requestLogger({ logger }) {
  return function (req, res, next) {
    const start = Date.now();

    res.on("finish", () => {
      const ms = Date.now() - start;

      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || ""
      });
    });

    next();
  };
}

module.exports = requestLogger;
