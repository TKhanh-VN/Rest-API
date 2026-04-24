const express = require("express");
const os = require("os");

const { success, error } = require("../utils/apiResponse");
const adminAuth = require("../middleware/adminAuth");
const validateRequest = require("../middleware/validateRequest");
const antiDdos = require("../middleware/antiDdos");

module.exports = function adminRoutes({ manager, logger, storage }) {
  const router = express.Router();

  router.use(adminAuth({ storage }));
  router.use(validateRequest);

  router.get("/status", (req, res) => {
    const memory = process.memoryUsage();

    return success(res, "Server status", {
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed
      },
      cpu: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    });
  });

  router.get("/plugins", (req, res) => {
    return success(res, "Plugin list", manager.getPluginList());
  });

  router.post("/plugins/reload", async (req, res) => {
    const plugins = await manager.reloadPlugins();
    return success(res, "Plugins reloaded", plugins);
  });

  router.post("/plugins/toggle", async (req, res) => {
    const { key, enabled } = req.body || {};

    if (!key) {
      return error(res, "Missing plugin key", null, 400);
    }

    const result = await manager.setPluginEnabled(key, enabled);
    return success(res, "Plugin updated", result);
  });

  router.get("/endpoints", (req, res) => {
    return success(res, "Endpoint list", manager.getEndpoints());
  });

  router.get("/logs", (req, res) => {
    const limit = Number(req.query.limit || 200);
    return success(res, "Logs", logger.readLogs(limit));
  });

  router.delete("/logs", (req, res) => {
    logger.clearLogs();
    return success(res, "Logs cleared", null);
  });

  router.get("/blacklist", (req, res) => {
    return success(res, "Blacklist", storage.read("blacklist.json", []));
  });

  router.post("/blacklist", (req, res) => {
    const { ip } = req.body || {};

    if (!ip) {
      return error(res, "Missing IP", null, 400);
    }

    const list = storage.read("blacklist.json", []);

    if (!list.includes(ip)) {
      list.push(ip);
      storage.write("blacklist.json", list);
    }

    return success(res, "IP added to blacklist", list);
  });

  router.delete("/blacklist", (req, res) => {
    const { ip } = req.body || {};

    if (!ip) {
      return error(res, "Missing IP", null, 400);
    }

    const list = storage.read("blacklist.json", []).filter((item) => item !== ip);
    storage.write("blacklist.json", list);

    return success(res, "IP removed from blacklist", list);
  });

  router.get("/security", (req, res) => {
    const config = storage.read("system-config.json", {});
    return success(res, "Security config", config.antiDdos || {});
  });

  router.put("/security", (req, res) => {
    const config = storage.read("system-config.json", {});
    config.antiDdos = {
      ...(config.antiDdos || {}),
      ...(req.body || {})
    };

    storage.write("system-config.json", config);

    return success(res, "Anti-DDoS config updated", config.antiDdos);
  });

  router.get("/traffic", (req, res) => {
    return success(res, "Traffic monitor", antiDdos.getTraffic());
  });

  return router;
};
