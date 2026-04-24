const trafficStore = new Map();
const endpointStore = new Map();
let protectionMode = false;

function now() {
  return Date.now();
}

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || "unknown";
}

function cleanOldRequests(records, windowMs) {
  const current = now();
  return records.filter((time) => current - time <= windowMs);
}

function antiDdos({ logger, storage }) {
  return function (req, res, next) {
    const config = storage.read("system-config.json", {});
    const antiConfig = config.antiDdos || {};

    if (antiConfig.enabled === false) {
      return next();
    }

    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";
    const blacklist = storage.read("blacklist.json", []);
    const whitelist = storage.read("whitelist.json", []);

    if (whitelist.includes(ip)) {
      return next();
    }

    if (blacklist.includes(ip)) {
      logger.warn("Blocked blacklisted IP", { ip });

      return res.status(403).json({
        success: false,
        message: "Your IP is blocked",
        data: null
      });
    }

    if (antiConfig.blockEmptyUserAgent && !userAgent.trim()) {
      logger.warn("Blocked empty user-agent", { ip });

      return res.status(403).json({
        success: false,
        message: "Suspicious request blocked",
        data: null
      });
    }

    req.setTimeout(antiConfig.requestTimeoutMs || 15000);

    const windowMs = antiConfig.windowMs || 10000;
    const maxRequests = antiConfig.maxRequests || 80;
    const burstWindowMs = antiConfig.burstWindowMs || 2000;
    const burstMaxRequests = antiConfig.burstMaxRequests || 25;
    const temporaryBlacklistMs = antiConfig.temporaryBlacklistMs || 300000;

    const item = trafficStore.get(ip) || {
      requests: [],
      temporaryBlockedUntil: 0
    };

    if (item.temporaryBlockedUntil > now()) {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
        data: null
      });
    }

    item.requests = cleanOldRequests(item.requests, windowMs);
    item.requests.push(now());

    const burstRequests = cleanOldRequests(item.requests, burstWindowMs);

    if (item.requests.length > maxRequests || burstRequests.length > burstMaxRequests) {
      item.temporaryBlockedUntil = now() + temporaryBlacklistMs;

      logger.warn("Temporary blocked IP by anti-ddos", {
        ip,
        requests: item.requests.length,
        burstRequests: burstRequests.length
      });

      trafficStore.set(ip, item);

      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded",
        data: null
      });
    }

    trafficStore.set(ip, item);

    const endpointKey = `${req.method} ${req.path}`;
    const endpointData = endpointStore.get(endpointKey) || [];
    const endpointClean = cleanOldRequests(endpointData, windowMs);
    endpointClean.push(now());
    endpointStore.set(endpointKey, endpointClean);

    const totalTraffic = Array.from(trafficStore.values())
      .reduce((total, record) => total + cleanOldRequests(record.requests, windowMs).length, 0);

    protectionMode = totalTraffic >= (antiConfig.protectionModeThreshold || 300);

    if (protectionMode && item.requests.length > Math.floor(maxRequests / 2)) {
      return res.status(503).json({
        success: false,
        message: "Server protection mode enabled",
        data: null
      });
    }

    next();
  };
}

antiDdos.getTraffic = function () {
  const result = [];

  for (const [ip, data] of trafficStore.entries()) {
    result.push({
      ip,
      requests: data.requests.length,
      temporaryBlockedUntil: data.temporaryBlockedUntil
    });
  }

  return {
    protectionMode,
    ips: result,
    endpoints: Array.from(endpointStore.entries())
      .map(([endpoint, requests]) => ({
        endpoint,
        requests: requests.length
      }))
      .sort((a, b) => b.requests - a.requests)
  };
};

module.exports = antiDdos;
