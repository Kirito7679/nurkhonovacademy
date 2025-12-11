import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  getMyStats,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { upload } from '../controllers/fileController';
import { AppError } from '../utils/errors';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.get('/me/stats', authenticate, getMyStats);
router.put('/me', authenticate, updateProfile);
router.put('/me/password', authenticate, changePassword);
router.post('/me/avatar', authenticate, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return next(new AppError(err.message || 'Ошибка при загрузке файла', 400));
    }
    next();
  });
}, uploadAvatar);

export default router;

