const path = require("path");
const { scanPluginFiles } = require("./fileScanner");

class PluginManager {
  constructor({ app, logger, storage, pluginsPath }) {
    this.app = app;
    this.logger = logger;
    this.storage = storage;
    this.pluginsPath = pluginsPath;
    this.plugins = new Map();
    this.endpoints = [];
    this.routerStackStartIndex = 0;
  }

  getPluginKey(folder, fileName) {
    return `${folder}/${fileName}`;
  }

  getStates() {
    return this.storage.read("plugin-states.json", {});
  }

  saveStates(states) {
    this.storage.write("plugin-states.json", states);
  }

  getPluginList() {
    return Array.from(this.plugins.values()).map((item) => ({
      key: item.key,
      folder: item.folder,
      file: item.file,
      endpoint: item.endpoint,
      method: item.method,
      enabled: item.enabled,
      description: item.description || "",
      loaded: item.loaded,
      error: item.error || null
    }));
  }

  getEndpoints() {
    return this.endpoints;
  }

  clearPluginRoutes() {
    if (!this.app._router || !Array.isArray(this.app._router.stack)) return;

    this.app._router.stack = this.app._router.stack.filter((layer) => {
      return !layer.pluginRoute;
    });

    this.endpoints = [];
    this.plugins.clear();
  }

  async loadPlugins() {
    this.clearPluginRoutes();

    const files = scanPluginFiles(this.pluginsPath);
    const states = this.getStates();

    for (const item of files) {
      const key = this.getPluginKey(item.folder, item.fileName);

      try {
        delete require.cache[require.resolve(item.fullPath)];

        const plugin = require(item.fullPath);
        const config = plugin.config || {};

        const method = String(config.method || "get").toLowerCase();
        const allowedMethods = ["get", "post", "put", "patch", "delete"];

        if (!allowedMethods.includes(method)) {
          this.logger.error(`Plugin ${key} có method không hợp lệ`);
          continue;
        }

        if (typeof plugin.call !== "function") {
          this.logger.error(`Plugin ${key} thiếu function call`);
          continue;
        }

        const enabledByConfig = config.enabled !== false;
        const enabledByState = states[key];

        const enabled = typeof enabledByState === "boolean"
          ? enabledByState
          : enabledByConfig;

        const pluginData = {
          key,
          folder: item.folder,
          file: item.file,
          fileName: item.fileName,
          endpoint: item.endpoint,
          method,
          enabled,
          description: config.description || "",
          auth: config.auth === true,
          loaded: true,
          error: null
        };

        this.plugins.set(key, pluginData);

        if (!enabled) {
          this.logger.warn(`Plugin ${key} đang tắt`);
          continue;
        }

        if (typeof plugin.onload === "function") {
          try {
            await plugin.onload({
              app: this.app,
              manager: this,
              logger: this.logger,
              storage: this.storage
            });
          } catch (error) {
            this.logger.error(`Onload plugin ${key} lỗi`, {
              error: error.message
            });
          }
        }

        const routeHandler = async (req, res, next) => {
          try {
            return await plugin.call({
              req,
              res,
              next,
              manager: this,
              logger: this.logger,
              storage: this.storage
            });
          } catch (error) {
            this.logger.error(`Call plugin ${key} lỗi`, {
              error: error.message
            });

            return res.status(500).json({
              success: false,
              message: "Plugin execution error",
              data: {
                plugin: key
              }
            });
          }
        };

        this.app[method](item.endpoint, routeHandler);

        const lastLayer = this.app._router.stack[this.app._router.stack.length - 1];

        if (lastLayer) {
          lastLayer.pluginRoute = true;
        }

        this.endpoints.push({
          key,
          endpoint: item.endpoint,
          method: method.toUpperCase(),
          folder: item.folder,
          file: item.file,
          enabled: true
        });

        this.logger.info(`Loaded plugin ${key} => ${method.toUpperCase()} ${item.endpoint}`);
      } catch (error) {
        this.plugins.set(key, {
          key,
          folder: item.folder,
          file: item.file,
          endpoint: item.endpoint,
          method: "unknown",
          enabled: false,
          loaded: false,
          error: error.message
        });

        this.logger.error(`Load plugin ${key} lỗi`, {
          error: error.message
        });
      }
    }

    return this.getPluginList();
  }

  async reloadPlugins() {
    return await this.loadPlugins();
  }

  async setPluginEnabled(key, enabled) {
    const states = this.getStates();
    states[key] = Boolean(enabled);
    this.saveStates(states);
    await this.reloadPlugins();

    return {
      key,
      enabled: Boolean(enabled)
    };
  }
}

module.exports = {
  PluginManager
};
