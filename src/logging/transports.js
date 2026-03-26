const fs = require('fs');
const path = require('path');
const { transports } = require('winston');

const LOG_ROOT = path.resolve(process.cwd(), 'logs');

const ensureDirectory = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const buildFileTransport = (folderName, fileName, level) => {
  const directory = path.join(LOG_ROOT, folderName);
  ensureDirectory(directory);

  return new transports.File({
    filename: path.join(directory, fileName),
    level,
    maxsize: 1024 * 1024,
    maxFiles: 5
  });
};

module.exports = { buildFileTransport };
