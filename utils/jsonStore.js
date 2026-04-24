const fs = require("fs-extra");
const path = require("path");

class JsonStore {
  constructor({ basePath }) {
    this.basePath = basePath;
    this.dataPath = path.join(basePath, "data");
    this.logsPath = path.join(basePath, "logs");
  }

  ensureDefaultFiles() {
    fs.ensureDirSync(this.dataPath);
    fs.ensureDirSync(this.logsPath);

    this.ensureFile("plugin-states.json", {});
    this.ensureFile("blacklist.json", []);
    this.ensureFile("whitelist.json", ["127.0.0.1", "::1"]);
    this.ensureFile("system-config.json", {
      adminToken: "change-this-admin-token",
      antiDdos: {
        enabled: true,
        windowMs: 10000,
        maxRequests: 80,
        burstWindowMs: 2000,
        burstMaxRequests: 25,
        temporaryBlacklistMs: 300000,
        blockEmptyUserAgent: true,
        protectionModeThreshold: 300,
        requestTimeoutMs: 15000
      }
    });
  }

  ensureFile(fileName, defaultValue) {
    const filePath = path.join(this.dataPath, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeJsonSync(filePath, defaultValue, {
        spaces: 2
      });
    }
  }

  read(fileName, fallback = null) {
    try {
      const filePath = path.join(this.dataPath, fileName);
      this.ensureFile(fileName, fallback);
      return fs.readJsonSync(filePath);
    } catch {
      return fallback;
    }
  }

  write(fileName, data) {
    const filePath = path.join(this.dataPath, fileName);
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeJsonSync(filePath, data, {
      spaces: 2
    });
  }
}

module.exports = {
  JsonStore
};
