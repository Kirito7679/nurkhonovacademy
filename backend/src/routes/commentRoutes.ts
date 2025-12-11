import { Router } from 'express';
import {
  getLessonComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import { commentLimiter } from '../middleware/rateLimit';

const router = Router();

// Get all comments for a lesson (with pagination)
router.get('/lesson/:lessonId', authenticate, getLessonComments);

// Create a comment (with rate limiting)
router.post('/lesson/:lessonId', authenticate, commentLimiter, createComment);

// Update a comment
router.put('/:commentId', authenticate, commentLimiter, updateComment);

// Delete a comment
router.delete('/:commentId', authenticate, deleteComment);

export default router;

