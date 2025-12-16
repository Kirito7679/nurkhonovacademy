import { Router } from 'express';
import {
  createCurator,
  getAllCurators,
  getCuratorById,
  updateCurator,
  resetCuratorPassword,
  deleteCurator,
} from '../controllers/curatorController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// All routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Create curator
router.post('/', createCurator);

// Get all curators
router.get('/', getAllCurators);

// Get curator by ID
router.get('/:id', getCuratorById);

// Update curator
router.put('/:id', updateCurator);

// Reset curator password
router.put('/:id/reset-password', resetCuratorPassword);

// Delete curator
router.delete('/:id', deleteCurator);

export default router;


