import { Router } from 'express';
import {
  getIntegrations,
  createIntegration,
  deleteIntegration,
} from '../controllers/integrationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get integrations
router.get('/', getIntegrations);

// Create integration
router.post('/', createIntegration);

// Delete integration
router.delete('/:id', deleteIntegration);

export default router;
