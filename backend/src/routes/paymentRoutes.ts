import { Router } from 'express';
import {
  processTeacherPayment,
  getPaymentStatus,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

// Get payment status
router.get('/teacher/status', authenticate, requireRole('TEACHER'), getPaymentStatus);

// Process teacher payment
router.post('/teacher/process', authenticate, requireRole('TEACHER'), processTeacherPayment);

export default router;
