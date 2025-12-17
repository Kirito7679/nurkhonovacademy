import { Router } from 'express';
import {
  getClassMessages,
  sendClassMessage,
  deleteClassMessage,
} from '../controllers/classChatController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Получить сообщения группового чата класса
router.get('/classes/:classId/messages', authenticate, getClassMessages);

// Отправить сообщение в групповой чат
router.post('/classes/:classId/messages', authenticate, sendClassMessage);

// Удалить сообщение из группового чата
router.delete('/classes/messages/:messageId', authenticate, deleteClassMessage);

export default router;




