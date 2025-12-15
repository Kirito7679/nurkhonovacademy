import { Router } from 'express';
import {
  createCurator,
  getAllCurators,
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

export default router;
