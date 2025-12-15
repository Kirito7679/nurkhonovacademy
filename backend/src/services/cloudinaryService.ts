import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Upload file buffer to Cloudinary
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'nurkhonov-academy',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format || '',
            width: result.width,
            height: result.height,
            bytes: result.bytes || 0,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    // Convert buffer to stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload image with optimization for avatars
 */
export const uploadAvatar = async (buffer: Buffer): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'nurkhonov-academy/avatars',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format || '',
            width: result.width,
            height: result.height,
            bytes: result.bytes || 0,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload lesson files (PDFs, documents, etc.)
 */
export const uploadLessonFile = async (
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> => {
  const ext = originalName.split('.').pop()?.toLowerCase();
  const resourceType = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')
    ? 'raw'
    : 'auto';

  return uploadToCloudinary(buffer, 'nurkhonov-academy/lessons', resourceType);
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    // Don't throw - file might not exist
  }
};

/**
 * Extract public_id from Cloudinary URL
 */
export const extractPublicId = (url: string): string | null => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export default cloudinary;

