import { Router } from 'express';
import {
  uploadFile,
  downloadFile,
  deleteFileById,
  downloadAvatar,
  upload,
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

router.post('/upload', authenticate, requireRole('TEACHER', 'ADMIN'), upload.single('file'), uploadFile);
router.get('/download/:fileId', authenticate, downloadFile);
router.get('/avatar/:fileName', downloadAvatar);
router.delete('/:fileId', authenticate, requireRole('TEACHER', 'ADMIN'), deleteFileById);

export default router;

