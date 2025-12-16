import { Request, Response, NextFunction } from 'express';
import { getLessonComments, createComment } from '../../controllers/commentController';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { AppError } from '../../utils/errors';

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    lesson: {
      findUnique: jest.fn(),
    },
    studentCourse: {
      findUnique: jest.fn(),
    },
    comment: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock notification controller
jest.mock('../../controllers/notificationController', () => ({
  createNotification: jest.fn(),
}));

// Mock socket service
jest.mock('../../services/socketService', () => ({
  emitCommentUpdate: jest.fn(),
}));

describe('Comment Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: { lessonId: 'lesson-123' },
      query: { page: '1', limit: '10' },
      user: {
        id: 'user-123',
        role: 'STUDENT',
        phone: '+1234567890',
        firstName: 'Test',
        lastName: 'User',
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLessonComments', () => {
    it('should return comments for student with access', async () => {
      const mockLesson = {
        id: 'lesson-123',
        courseId: 'course-123',
        course: {
          teacherId: 'teacher-123',
          trialLessonId: null,
        },
      };

      const mockStudentCourse = {
        status: 'APPROVED',
      };

      const mockComments = [
        {
          id: 'comment-1',
          content: 'Test comment',
          userId: 'user-123',
          createdAt: new Date(),
          user: {
            id: 'user-123',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: null,
            role: 'STUDENT',
          },
          replies: [],
        },
      ];

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.studentCourse.findUnique as jest.Mock).mockResolvedValue(mockStudentCourse);
      (prisma.comment.count as jest.Mock).mockResolvedValue(1);
      (prisma.comment.findMany as jest.Mock).mockResolvedValue(mockComments);

      await getLessonComments(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          comments: mockComments,
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 1,
          }),
        },
      });
    });

    it('should deny access for student without approved course', async () => {
      const mockLesson = {
        id: 'lesson-123',
        courseId: 'course-123',
        course: {
          teacherId: 'teacher-123',
          trialLessonId: null,
        },
      };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.studentCourse.findUnique as jest.Mock).mockResolvedValue(null);

      await getLessonComments(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });
  });

  describe('createComment', () => {
    it('should create comment for student with access', async () => {
      const mockLesson = {
        id: 'lesson-123',
        courseId: 'course-123',
        course: {
          teacherId: 'teacher-123',
          trialLessonId: null,
          title: 'Test Course',
        },
        title: 'Test Lesson',
      };

      const mockStudentCourse = {
        status: 'APPROVED',
      };

      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        userId: 'user-123',
        lessonId: 'lesson-123',
        createdAt: new Date(),
        user: {
          id: 'user-123',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: null,
          role: 'STUDENT',
        },
        replies: [],
        lesson: {
          id: 'lesson-123',
          title: 'Test Lesson',
          courseId: 'course-123',
          course: {
            teacherId: 'teacher-123',
            title: 'Test Course',
          },
        },
      };

      mockRequest.body = { content: 'Test comment' };

      (prisma.lesson.findUnique as jest.Mock).mockResolvedValue(mockLesson);
      (prisma.studentCourse.findUnique as jest.Mock).mockResolvedValue(mockStudentCourse);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: 'Test',
        lastName: 'User',
      });
      (prisma.comment.create as jest.Mock).mockResolvedValue(mockComment);

      await createComment(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
        message: 'Комментарий успешно добавлен',
      });
    });
  });
});
