const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/**
 * Custom Multer storage engine for Cloudinary v2
 */
const createCloudinaryStorage = (folder, transformation) => ({
  _handleFile(_req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation,
      },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      }
    );
    file.stream.pipe(uploadStream);
  },

  _removeFile(_req, file, cb) {
    cloudinary.uploader.destroy(file.filename, cb);
  },
});

/** Storage configs */
const eventBannerStorage = createCloudinaryStorage(
  'event-management/events',
  [{ width: 1280, height: 720, crop: 'fill' }]
);

const avatarStorage = createCloudinaryStorage(
  'event-management/avatars',
  [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
);

/** File-type filter: images only */
const imageFilter = (_req, file, cb) => {
  console.log('📁 Multer filter check:', file.originalname, file.mimetype);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files are allowed'), false);
  }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: eventBannerStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/** Wrapper: if Cloudinary/multer errors, log and continue without assets */
const uploadEventAssets = (req, res, next) => {
  const multerFields = upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
  ]);

  multerFields(req, res, (err) => {
    if (err) {
      console.error('⚠️  Multer/Cloudinary upload error (continuing without assets):', err.message || err);
      req.files = undefined;
    }
    next();
  });
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('avatar');

module.exports = { uploadEventAssets, uploadAvatar };