export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  ASSISTANT = 'ASSISTANT',
}

export type SupportedLanguage = 'ru' | 'en' | 'uz';

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
  language?: SupportedLanguage;
  createdAt: string;
  updatedAt?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  price: number;
  trialLessonId?: string | null;
  teacherId: string;
  isVisible?: boolean;
  createdAt: string;
  updatedAt: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    telegram?: string | null;
  };
  modules?: Module[];
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
  moduleId?: string | null;
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
  module?: Module | null;
  files?: LessonFile[];
  _count?: {
    files: number;
  };
  progress?: StudentProgress | null;
  practiceExercises?: PracticeExercise[];
  flashcardDecks?: FlashcardDeck[];
  integrations?: ExternalIntegration[];
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

export interface QuizOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean;
  order: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  type: QuizQuestionType;
  order: number;
  metadata?: string | null; // JSON string for complex question data
  options?: QuizOption[];
  correctAnswer?: string | null;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title?: string | null;
  description?: string | null;
  passingScore: number;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
  results?: QuizResult[];
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  passed: boolean;
  answers: string; // JSON string
  completedAt: string;
  correctAnswers?: number;
  totalQuestions?: number;
  passingScore?: number;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string | null;
  chatType?: 'PRIVATE' | 'GROUP';
  classId?: string;
  className?: string;
  studentCount?: number;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
    senderName?: string;
  } | null;
  unreadCount?: number;
}

export interface FlashcardDeck {
  id: string;
  courseId?: string | null;
  lessonId?: string | null;
  title: string;
  description?: string | null;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  flashcards?: Flashcard[];
  _count?: {
    flashcards: number;
  };
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  progress?: FlashcardProgress | null;
}

export interface FlashcardProgress {
  id: string;
  userId: string;
  deckId: string;
  cardId: string;
  difficulty: 'NEW' | 'EASY' | 'MEDIUM' | 'HARD';
  lastReviewed?: string | null;
  nextReview?: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeExercise {
  id: string;
  lessonId: string;
  title: string;
  description?: string | null;
  type: string;
  instructions: string;
  solution?: string | null;
  autoCheck: boolean;
  maxAttempts: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  metadata?: string | null; // JSON string for exercise data (drag-drop items, matching pairs, etc.)
}

// Types for interactive exercises
export interface DragDropItem {
  id: string;
  content: string;
}

export interface DragDropZone {
  id: string;
  label: string;
  correctItemId: string;
}

export interface DragDropExercise {
  type: 'DRAG_DROP';
  items: DragDropItem[];
  dropZones: DragDropZone[];
}

export interface MatchingItem {
  id: string;
  left: string;
  right: string;
}

export interface MatchingExercise {
  type: 'MATCHING';
  items: MatchingItem[];
}

export interface PracticeResult {
  id: string;
  exerciseId: string;
  studentId: string;
  answer: string;
  score?: number | null;
  feedback?: string | null;
  status: 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  attemptNumber: number;
  submittedAt: string;
  exercise?: PracticeExercise;
  student?: User;
}

export interface ExternalIntegration {
  id: string;
  userId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  type: 'GOOGLE_DOCS' | 'QUIZLET' | 'YOUTUBE' | 'OTHER';
  externalId: string;
  externalUrl: string;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export type QuizQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'DRAG_DROP' | 'MATCHING' | 'FILL_BLANK';

// API Error types
export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

export interface StudentCourseWithDetails extends StudentCourse {
  course?: Course;
  student?: User;
}

export interface StudentWithCourses extends User {
  studentCourses?: StudentCourseWithDetails[];
  progress?: StudentProgress[];
}

// Group Classes Types
export enum ClassStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ClassStudent {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  approvedAt?: string | null;
  student?: User;
  class?: Class;
}

export interface Class {
  id: string;
  name: string;
  description?: string | null;
  teacherId: string;
  maxStudents: number;
  level?: string | null; // "Beginner", "Intermediate", "Advanced"
  language?: string | null;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
  teacher?: User;
  students?: ClassStudent[];
  _count?: {
    students: number;
  };
}

