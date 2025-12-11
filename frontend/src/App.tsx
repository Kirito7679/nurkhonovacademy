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
            path="/profile"
            element={
              <PrivateRoute allowedRoles={[Role.STUDENT]}>
                <Profile />
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
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <Students />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/students/:id"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <StudentDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <TeacherCourses />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/new"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <CourseForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:id/edit"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <CourseForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/new"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <LessonForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/lessons/:lessonId/edit"
            element={
              <PrivateRoute allowedRoles={[Role.TEACHER, Role.ADMIN]}>
                <LessonForm />
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
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

