import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
export const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
};

// Allowed file types
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
  'video/x-flv', // .flv
  'video/mpeg',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (увеличено для видео)

export const validateFile = (file: Express.Multer.File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'Файл не предоставлен' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Размер файла превышает 50MB' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: 'Неподдерживаемый тип файла' };
  }

  return { valid: true };
};

export const generateFileName = (originalName: string): string => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${sanitizedBaseName}_${uuidv4()}${ext}`;
};

export const getFilePath = (fileName: string): string => {
  return path.join(UPLOAD_DIR, fileName);
};

export const deleteFile = async (fileName: string): Promise<void> => {
  const filePath = getFilePath(fileName);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, ignore error
    console.error('Error deleting file:', error);
  }
};

