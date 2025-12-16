import { Router } from 'express';
import {
  createCurator,
  getAllCurators,
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

// Delete curator
router.delete('/:id', deleteCurator);

export default router;


