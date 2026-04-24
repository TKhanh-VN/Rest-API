const fs = require("fs-extra");
const path = require("path");

function scanPluginFiles(basePath) {
  const results = [];

  if (!fs.existsSync(basePath)) {
    fs.ensureDirSync(basePath);
    return results;
  }

  const folders = fs.readdirSync(basePath);

  for (const folder of folders) {
    const folderPath = path.join(basePath, folder);
    const folderStat = fs.statSync(folderPath);

    if (!folderStat.isDirectory()) continue;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const fullPath = path.join(folderPath, file);
      const fileName = path.basename(file, ".js");

      results.push({
        folder,
        file,
        fileName,
        fullPath,
        endpoint: `/${folder}/${fileName}`
      });
    }
  }

  return results;
}

module.exports = {
  scanPluginFiles
};
