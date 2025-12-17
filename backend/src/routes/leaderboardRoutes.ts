import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get leaderboard - accessible to all authenticated users
router.get('/', authenticate, getLeaderboard);

export default router;
