import { Router } from 'express';
import {
  getActiveStories,
  viewStory,
  createStory,
  deleteStory,
} from '../controllers/storyController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Get active stories (all authenticated users)
router.get('/', authenticate, getActiveStories);

// View story (mark as viewed)
router.post('/:storyId/view', authenticate, viewStory);

// Create story (admin only)
router.post('/', authenticate, requireRole('ADMIN'), createStory);

// Delete story (admin only)
router.delete('/:storyId', authenticate, requireRole('ADMIN'), deleteStory);

export default router;
