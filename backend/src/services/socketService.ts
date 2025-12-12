import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

let io: SocketServer | null = null;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = user.id;
      socket.data.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected to socket`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join lesson room when viewing a lesson
    socket.on('join-lesson', (lessonId: string) => {
      socket.join(`lesson:${lessonId}`);
      console.log(`User ${userId} joined lesson ${lessonId}`);
    });

    socket.on('leave-lesson', (lessonId: string) => {
      socket.leave(`lesson:${lessonId}`);
      console.log(`User ${userId} left lesson ${lessonId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from socket`);
    });
  });

  return io;
};

export const emitNotification = (userId: string, notification: any) => {
  if (io) {
    io.to(`user:${userId}`).emit('new-notification', notification);
  }
};

export const emitCommentUpdate = (lessonId: string, comment: any) => {
  if (io) {
    // Emit to all users viewing this lesson
    io.to(`lesson:${lessonId}`).emit('new-comment', comment);
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};


