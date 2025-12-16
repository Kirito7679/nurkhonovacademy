import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import LessonView from './pages/LessonView';
import Profile from './pages/Profile';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherStatistics from './pages/TeacherStatistics';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import TeacherCourses from './pages/TeacherCourses';
import CourseForm from './pages/CourseForm';
import LessonForm from './pages/LessonForm';
import Chat from './pages/Chat';
import TeacherChats from './pages/TeacherChats';
import FlashcardDecks from './pages/FlashcardDecks';
import FlashcardStudy from './pages/FlashcardStudy';
import FlashcardDeckEdit from './pages/FlashcardDeckEdit';
import PracticeExercises from './pages/PracticeExercises';
import Integrations from './pages/Integrations';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import ClassChat from './pages/ClassChat';
import Curators from './pages/Curators';
import TeacherPayment from './pages/TeacherPayment';
import IntermediateTestForm from './pages/IntermediateTestForm';
import IntermediateTestView from './pages/IntermediateTestView';
import Layout from './components/Layout';
import { Role } from './types';

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
    </Router>
  );
}

export default App;

