import { Router } from 'express';
import {
  getTeacherChats,
  getChatMessages,
  sendMessage,
  getStudentTeacher,
  uploadMessageFile,
  downloadMessageFile,
  deleteMessage,
} from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { upload } from '../controllers/fileController';

const router = Router();

// Get teacher's chat list (students)
router.get('/teacher/chats', authenticate, requireRole('TEACHER', 'ADMIN'), getTeacherChats);

// Get student's teacher
router.get('/student/teacher', authenticate, requireRole('STUDENT'), getStudentTeacher);

// Get messages with specific user
router.get('/chat/:userId', authenticate, getChatMessages);

// Upload file for message
router.post('/upload-file', authenticate, upload.single('file'), uploadMessageFile);

// Download message file
router.get('/files/:fileName', authenticate, downloadMessageFile);

// Send a message
router.post('/send', authenticate, sendMessage);

// Delete a message
router.delete('/:messageId', authenticate, deleteMessage);

export default router;

