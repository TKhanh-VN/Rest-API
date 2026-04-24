const { error } = require("../utils/apiResponse");

function adminAuth({ storage }) {
  return function (req, res, next) {
    const config = storage.read("system-config.json", {});
    const token = config.adminToken || "";
    const inputToken = req.headers.authorization?.replace("Bearer ", "") || req.query.token || "";

    if (!token || inputToken !== token) {
      return error(res, "Admin authentication failed", null, 401);
    }

    return next();
  };
}

module.exports = adminAuth;
