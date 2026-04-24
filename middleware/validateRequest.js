const { error } = require("../utils/apiResponse");

function validateRequest(req, res, next) {
  if (!req.body) {
    return next();
  }

  if (typeof req.body !== "object") {
    return error(res, "Invalid request body", null, 400);
  }

  return next();
}

module.exports = validateRequest;
