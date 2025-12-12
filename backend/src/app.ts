import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import lessonRoutes from './routes/lessonRoutes';
// import studentRoutes from './routes/studentRoutes'; // Temporarily disabled - controller has errors
import fileRoutes from './routes/fileRoutes';
import commentRoutes from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import statisticsRoutes from './routes/statisticsRoutes';
import exportRoutes from './routes/exportRoutes';
import quizRoutes from './routes/quizRoutes';
import messageRoutes from './routes/messageRoutes';
import moduleRoutes from './routes/moduleRoutes';
import flashcardRoutes from './routes/flashcardRoutes';
import practiceRoutes from './routes/practiceRoutes';
import integrationRoutes from './routes/integrationRoutes';
import activityLogRoutes from './routes/activityLogRoutes';
import { errorHandler } from './utils/errors';
import { ensureUploadDir } from './services/fileService';
import { apiLimiter } from './middleware/rateLimit';
import { initializeSocket } from './services/socketService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

// Trust proxy for Railway (needed for rate limiting behind proxy)
// Railway uses 1 proxy, so we trust only the first proxy
app.set('trust proxy', 1);

// Initialize Socket.IO
initializeSocket(httpServer);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://academy.dilmurodnurkhonov.uz',
    'https://www.academy.dilmurodnurkhonov.uz',
    'https://api.academy.dilmurodnurkhonov.uz',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Ensure upload directory exists
ensureUploadDir();

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
// app.use('/api/students', studentRoutes); // Temporarily disabled - controller has errors
app.use('/api/files', fileRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Log registered routes for debugging
console.log('✅ Routes registered:');
console.log('  - /api/auth');
console.log('  - /api/courses');
console.log('  - /api/lessons');
console.log('  - /api/students');
console.log('  - /api/files');
console.log('  - /api/comments');
console.log('  - /api/notifications');
console.log('  - /api/statistics');
console.log('  - /api/export');
console.log('  - /api/quizzes');
console.log('  - /api/messages');
console.log('  - /api/modules');
console.log('  - /api/flashcards');
console.log('  - /api/practice');
console.log('  - /api/integrations');
console.log('  - /api/activity-logs');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handler
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});

export default app;

