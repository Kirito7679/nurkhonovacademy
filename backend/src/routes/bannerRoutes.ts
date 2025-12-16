import { Router } from 'express';
import {
  getActiveBanners,
  createBanner,
  deleteBanner,
} from '../controllers/bannerController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Get active banners (all authenticated users)
router.get('/', authenticate, getActiveBanners);

// Create banner (admin only)
router.post('/', authenticate, requireRole('ADMIN'), createBanner);

// Delete banner (admin only)
router.delete('/:bannerId', authenticate, requireRole('ADMIN'), deleteBanner);

export default router;
