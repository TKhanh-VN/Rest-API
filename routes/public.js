const express = require("express");
const { success } = require("../utils/apiResponse");

module.exports = function publicRoutes({ manager }) {
  const router = express.Router();

  router.get("/status", (req, res) => {
    return success(res, "Public API is running", {
      uptime: process.uptime(),
      plugins: manager.getPluginList().length
    });
  });

  router.get("/endpoints", (req, res) => {
    return success(res, "Public endpoints", manager.getEndpoints());
  });

  return router;
};
