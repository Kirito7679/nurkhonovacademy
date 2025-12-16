import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import { Role } from './types';

// Lazy load all pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const LessonView = lazy(() => import('./pages/LessonView'));
const Profile = lazy(() => import('./pages/Profile'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherStatistics = lazy(() => import('./pages/TeacherStatistics'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const TeacherCourses = lazy(() => import('./pages/TeacherCourses'));
const CourseForm = lazy(() => import('./pages/CourseForm'));
const LessonForm = lazy(() => import('./pages/LessonForm'));
const Chat = lazy(() => import('./pages/Chat'));
const TeacherChats = lazy(() => import('./pages/TeacherChats'));
const FlashcardDecks = lazy(() => import('./pages/FlashcardDecks'));
const FlashcardStudy = lazy(() => import('./pages/FlashcardStudy'));
const FlashcardDeckEdit = lazy(() => import('./pages/FlashcardDeckEdit'));
const PracticeExercises = lazy(() => import('./pages/PracticeExercises'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Classes = lazy(() => import('./pages/Classes'));
const ClassDetails = lazy(() => import('./pages/ClassDetails'));
const ClassChat = lazy(() => import('./pages/ClassChat'));
const Curators = lazy(() => import('./pages/Curators'));
const TeacherPayment = lazy(() => import('./pages/TeacherPayment'));
const IntermediateTestForm = lazy(() => import('./pages/IntermediateTestForm'));
const IntermediateTestView = lazy(() => import('./pages/IntermediateTestView'));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="inline-block relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
      </div>
      <p className="mt-4 text-neutral-600">Загрузка...</p>
    </div>
  </div>
);

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: Role[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute allowedRoles={[Role.STUDENT, Role.TEACHER, Role.ADMIN]}>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Student routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <StudentDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <Courses />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <CourseDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId/lessons/:lessonId"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <LessonView />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId/tests/:testId"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <IntermediateTestView />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route
            path="/flashcards"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <FlashcardDecks />
              </PrivateRoute>
            }
          />
          <Route
            path="/flashcards/:id/study"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <FlashcardStudy />
              </PrivateRoute>
            }
          />
          <Route
            path="/flashcards/:id/edit"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <FlashcardDeckEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/lessons/:lessonId/practice"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <PracticeExercises />
              </PrivateRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <Integrations />
              </PrivateRoute>
            }
          />

          {/* Teacher routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/statistics"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <TeacherStatistics />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR, Role.ASSISTANT]}>
                <Students />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/students/:id"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR, Role.ASSISTANT]}>
                <StudentDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <TeacherCourses />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/new"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <CourseForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:id/edit"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <CourseForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/new"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <LessonForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/:lessonId/edit"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <LessonForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/tests/new"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.MODERATOR]}>
                <IntermediateTestForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/chats"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <TeacherChats />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <Classes />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/payment"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER]}>
                <TeacherPayment />
              </PrivateRoute>
            }
          />
          <Route
            path="/classes/:id"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <ClassDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/classes/:id/settings"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <ClassDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/classes/:id/chat"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN, Role.STUDENT]}>
                <ClassChat />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/curators"
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN]}>
                <Curators />
              </PrivateRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

