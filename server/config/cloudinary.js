const cloudinary = require('cloudinary').v2;

/**
 * Configures the Cloudinary SDK from environment variables.
 * Called once during app bootstrap (app.js).
 */
const connectCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  cloudinary.config({
    cloud_name: (CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key:    (CLOUDINARY_API_KEY    || '').trim(),
    api_secret: (CLOUDINARY_API_SECRET || '').trim(),
  });
  console.log('✅  Cloudinary configured');
};

module.exports = { cloudinary, connectCloudinary };
