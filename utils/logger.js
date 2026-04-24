const fs = require("fs-extra");
const path = require("path");
const { formatTime } = require("./time");

function createLogger() {
  const logDir = path.join(process.cwd(), "storage", "logs");
  const logFile = path.join(logDir, "app.log");

  fs.ensureDirSync(logDir);
  fs.ensureFileSync(logFile);

  function write(level, message, meta = null) {
    const line = JSON.stringify({
      time: formatTime(),
      level,
      message: String(message),
      meta
    });

    fs.appendFileSync(logFile, line + "\n", "utf8");

    if (level === "error") {
      console.error(`[${level.toUpperCase()}]`, message, meta || "");
    } else {
      console.log(`[${level.toUpperCase()}]`, message, meta || "");
    }
  }

  return {
    info(message, meta) {
      write("info", message, meta);
    },

    warn(message, meta) {
      write("warn", message, meta);
    },

    error(message, meta) {
      write("error", message, meta);
    },

    readLogs(limit = 200) {
      try {
        const content = fs.readFileSync(logFile, "utf8");
        return content
          .split("\n")
          .filter(Boolean)
          .slice(-limit)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return {
                time: formatTime(),
                level: "raw",
                message: line
              };
            }
          });
      } catch {
        return [];
      }
    },

    clearLogs() {
      fs.writeFileSync(logFile, "", "utf8");
    }
  };
}

module.exports = {
  createLogger
};
