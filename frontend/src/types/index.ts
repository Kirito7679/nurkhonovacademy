export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

export enum StudentCourseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  telegram?: string | null;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  price: number;
  trialLessonId?: string | null;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    telegram?: string | null;
  };
  _count?: {
    lessons: number;
    studentCourses: number;
  };
  hasAccess?: boolean;
  studentCourseStatus?: StudentCourseStatus | null;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    teacherId: string;
  };
  files?: LessonFile[];
  _count?: {
    files: number;
  };
  progress?: StudentProgress | null;
}

export interface LessonFile {
  id: string;
  lessonId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

export interface StudentCourse {
  id: string;
  studentId: string;
  courseId: string;
  status: StudentCourseStatus;
  purchaseRequestedAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  accessStartDate?: string | null;
  accessEndDate?: string | null;
  student?: User;
  course?: Course;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  lessonId: string;
  completed: boolean;
  watchedAt?: string | null;
  lastPosition: number;
  lesson?: Lesson;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface Comment {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role: Role;
  };
  replies?: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'COMMENT' | 'COURSE_REQUEST' | 'COURSE_APPROVED' | 'COURSE_REJECTED';
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination?: PaginationInfo;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: PaginationInfo;
}

