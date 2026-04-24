const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

const { createLogger } = require("./utils/logger");
const { JsonStore } = require("./utils/jsonStore");
const { PluginManager } = require("./utils/pluginManager");

const antiDdos = require("./middleware/antiDdos");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

const logger = createLogger();
const storage = new JsonStore({
  basePath: path.join(__dirname, "storage")
});

storage.ensureDefaultFiles();

const manager = new PluginManager({
  app,
  logger,
  storage,
  pluginsPath: path.join(__dirname, "plugins")
});

app.set("trust proxy", true);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors());

app.use(express.json({
  limit: "1mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "1mb"
}));

app.use(requestLogger({ logger, storage }));
app.use(antiDdos({ logger, storage }));

app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/", express.static(path.join(__dirname, "public")));

app.use("/api", publicRoutes({ manager, logger, storage }));
app.use("/admin", adminRoutes({ manager, logger, storage }));

manager.loadPlugins();

app.use(notFound);
app.use(errorHandler({ logger }));

app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});
