const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');
const { getEntityImageUrl } = require('../files/image-urls');

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const IMAGE_EXTENSIONS_BY_MIME_TYPE = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp'])
};
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PUBLIC_STORAGE_ROOT = path.join(__dirname, '../../storage/public');

const ensureUploadDirectory = (entityType) => {
  const uploadDirectory = path.join(PUBLIC_STORAGE_ROOT, 'uploads', entityType);
  fs.mkdirSync(uploadDirectory, { recursive: true });
  return uploadDirectory;
};

const createStorage = (entityType) => multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, ensureUploadDirectory(entityType));
  },
  filename: (_req, file, callback) => {
    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    callback(null, `${randomUUID()}${extension}`);
  }
});

const imageFileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
    callback(new Error('Only JPEG, PNG, and WEBP images are supported'));
    return;
  }

  if (!IMAGE_EXTENSIONS.has(extension)) {
    callback(new Error('Only .jpg, .jpeg, .png, and .webp image extensions are supported'));
    return;
  }

  if (!IMAGE_EXTENSIONS_BY_MIME_TYPE[file.mimetype].has(extension)) {
    callback(new Error('Image extension does not match the uploaded file type'));
    return;
  }

  callback(null, true);
};

const hasJpegSignature = (buffer) => buffer.length >= 4
  && buffer[0] === 0xff
  && buffer[1] === 0xd8
  && buffer[buffer.length - 2] === 0xff
  && buffer[buffer.length - 1] === 0xd9;

const hasPngSignature = (buffer) => buffer.length >= 8
  && buffer[0] === 0x89
  && buffer[1] === 0x50
  && buffer[2] === 0x4e
  && buffer[3] === 0x47
  && buffer[4] === 0x0d
  && buffer[5] === 0x0a
  && buffer[6] === 0x1a
  && buffer[7] === 0x0a;

const hasWebpSignature = (buffer) => buffer.length >= 12
  && buffer.toString('ascii', 0, 4) === 'RIFF'
  && buffer.toString('ascii', 8, 12) === 'WEBP';

const hasValidImageSignature = ({ mimetype, buffer }) => {
  if (mimetype === 'image/jpeg') {
    return hasJpegSignature(buffer);
  }

  if (mimetype === 'image/png') {
    return hasPngSignature(buffer);
  }

  if (mimetype === 'image/webp') {
    return hasWebpSignature(buffer);
  }

  return false;
};

const validateStoredFileSignature = async (file) => {
  if (!file) {
    return;
  }

  const fileBuffer = await fs.promises.readFile(file.path);
  if (hasValidImageSignature({ mimetype: file.mimetype, buffer: fileBuffer })) {
    return;
  }

  await fs.promises.unlink(file.path).catch(() => {});
  throw new Error('Uploaded image content does not match a supported file format');
};

const createImageUploadMiddleware = (entityType) => multer({
  storage: createStorage(entityType),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
    fields: 10,
    parts: 11
  }
}).single('image');

const handleImageUpload = (uploadMiddleware) => (req, res) => new Promise((resolve, reject) => {
  uploadMiddleware(req, res, async (error) => {
    if (!error) {
      try {
        await validateStoredFileSignature(req.file);
        resolve();
      } catch (validationError) {
        reject({ status: 422, body: { error: { code: 'INVALID_IMAGE', message: validationError.message } } });
      }
      return;
    }

    if (error instanceof multer.MulterError) {
      reject({ status: 400, body: { error: { code: 'UPLOAD_ERROR', message: error.message } } });
      return;
    }

    reject({ status: 422, body: { error: { code: 'INVALID_IMAGE', message: error.message } } });
  });
});

const getUploadedImageUrl = (entityType, file) => (file ? getEntityImageUrl({ entityType, filename: file.filename }) : null);

module.exports = {
  createImageUploadMiddleware,
  handleImageUpload,
  getUploadedImageUrl
};
