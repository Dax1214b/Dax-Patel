const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

class UploadService {
  // Upload image to Cloudinary
  async uploadImage(file, options = {}) {
    try {
      const uploadOptions = {
        folder: options.folder || 'stackit',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        ...options
      };

      // If specific dimensions are provided
      if (options.width && options.height) {
        uploadOptions.transformation.push({
          width: options.width,
          height: options.height,
          crop: 'fill'
        });
      }

      const result = await cloudinary.uploader.upload(file.path, uploadOptions);
      
      // Clean up local file
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Upload user avatar
  async uploadAvatar(file) {
    return this.uploadImage(file, {
      folder: 'stackit/avatars',
      width: 200,
      height: 200,
      crop: 'fill'
    });
  }

  // Upload question/answer images
  async uploadContentImage(file) {
    return this.uploadImage(file, {
      folder: 'stackit/content',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { width: 800, height: 600, crop: 'limit' }
      ]
    });
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image');
    }
  }

  // Generate image URL with transformations
  generateImageUrl(publicId, options = {}) {
    const transformation = [];
    
    if (options.width && options.height) {
      transformation.push({
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill'
      });
    }
    
    if (options.quality) {
      transformation.push({ quality: options.quality });
    }
    
    if (options.format) {
      transformation.push({ fetch_format: options.format });
    }

    return cloudinary.url(publicId, {
      transformation,
      secure: true
    });
  }

  // Upload multiple images
  async uploadMultipleImages(files, options = {}) {
    const uploadPromises = files.map(file => this.uploadImage(file, options));
    return Promise.all(uploadPromises);
  }

  // Optimize image for web
  async optimizeImage(file) {
    return this.uploadImage(file, {
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { width: 1200, height: 800, crop: 'limit' }
      ]
    });
  }

  // Create thumbnail
  async createThumbnail(file) {
    return this.uploadImage(file, {
      transformation: [
        { width: 150, height: 150, crop: 'fill' },
        { quality: 'auto:good' }
      ]
    });
  }

  // Validate file size
  validateFileSize(file, maxSize = 5 * 1024 * 1024) {
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }
    return true;
  }

  // Validate file type
  validateFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }
    return true;
  }

  // Get file info
  getFileInfo(file) {
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname).toLowerCase()
    };
  }

  // Generate unique filename
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(originalName);
    const name = path.basename(originalName, extension);
    
    return `${name}-${timestamp}-${random}${extension}`;
  }

  // Clean up old files
  async cleanupOldFiles(directory = 'uploads/', maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const fs = require('fs');
    const path = require('path');

    try {
      const files = fs.readdirSync(directory);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Export multer upload middleware
const uploadMiddleware = {
  single: (fieldName) => upload.single(fieldName),
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  fields: (fields) => upload.fields(fields)
};

module.exports = {
  UploadService: new UploadService(),
  uploadMiddleware
}; 