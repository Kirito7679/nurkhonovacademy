import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Course, Lesson, ApiResponse, StudentCourseStatus } from '../types';
import { Play, Lock, CheckCircle } from 'lucide-react';
import CoursePurchaseModal from '../components/CoursePurchaseModal';

export default function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { data: courseResponse, isLoading: courseLoading } = useQuery(
    ['course', id],
    async () => {
      const response = await api.get<ApiResponse<Course & { lessons: Lesson[] }>>(`/courses/${id}`);
      return response.data.data;
    }
  );

  const { data: lessonsResponse, isLoading: lessonsLoading } = useQuery(
    ['courseLessons', id],
    async () => {
      const response = await api.get<ApiResponse<Lesson[]>>(`/courses/${id}/lessons`);
      return response.data.data || [];
    },
    { enabled: !!courseResponse?.hasAccess }
  );

  const requestAccessMutation = useMutation(
    async () => {
      const response = await api.post<ApiResponse<{ status: StudentCourseStatus }>>(`/courses/${id}/request`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['course', id]);
        setShowPurchaseModal(false);
      },
      onError: () => {
        // При ошибке модальное окно остается открытым, чтобы пользователь мог попробовать снова
      },
    }
  );

  const course = courseResponse;
  const lessons = lessonsResponse || [];
  const trialLesson = course?.trialLessonId
    ? lessons.find((l) => l.id === course.trialLessonId)
    : null;

  if (courseLoading) {
    return (
      <div className="text-center py-12 code-bg particle-bg">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
        </div>
        <p className="mt-4 text-gray-400 font-mono">loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="code-bg particle-bg text-center py-12 animate-fade-scale">
        <div className="font-mono text-gray-400">
          <span className="text-[#39ff14]">if</span>{' '}
          <span className="text-white">(course === null)</span>{' '}
          <span className="text-[#39ff14]">return</span>{' '}
          <span className="text-red-400">'Курс не найден'</span>;
        </div>
      </div>
    );
  }

  const handleRequestAccess = () => {
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = () => {
    requestAccessMutation.mutate();
    // Модальное окно закроется автоматически после успешной отправки запроса в onSuccess
  };

  const handleTrialLesson = () => {
    if (trialLesson) {
      navigate(`/courses/${id}/lessons/${trialLesson.id}`);
    }
  };

  return (
    <div className="code-bg particle-bg">
      <div className="mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow mb-4 font-mono break-words">
          <span className="text-[#39ff14]">const</span> course <span className="text-[#39ff14]">=</span> <span className="text-white">'{course.title}'</span>;
        </h1>
        {course.description && (
          <p className="text-gray-400 text-sm md:text-base lg:text-lg font-mono break-words" aria-label="Описание курса">// {course.description}</p>
        )}
      </div>

      {course.hasAccess ? (
        <div className="animate-fade-scale">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 md:mb-6 font-mono">
            <span className="text-[#39ff14]">const</span> lessons <span className="text-[#39ff14]">=</span> <span className="text-[#00ff88]">course.lessons</span>;
          </h2>
          {lessonsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
              </div>
              <p className="mt-4 text-gray-400 font-mono">loading lessons...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12 animate-fade-scale">
              <div className="font-mono text-gray-400">
                <span className="text-[#39ff14]">if</span>{' '}
                <span className="text-white">(lessons.length === 0)</span>{' '}
                <span className="text-[#39ff14]">return</span>{' '}
                <span className="text-gray-500">'Нет уроков'</span>;
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="card card-hover p-4 md:p-6 cursor-pointer animate-slide-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                  onClick={() => navigate(`/courses/${id}/lessons/${lesson.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <span className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-primary text-black font-semibold font-mono animate-pulse-glow text-sm md:text-base flex-shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="text-base md:text-lg font-semibold text-white font-mono hover:text-[#39ff14] transition-colors break-words">
                          {lesson.title}
                        </h3>
                      </div>
                      {lesson.description && (
                        <p className="text-gray-400 text-xs md:text-sm ml-10 md:ml-13 font-mono break-words">// {lesson.description}</p>
                      )}
                      {lesson.progress?.completed && (
                        <span className="inline-flex items-center mt-2 ml-10 md:ml-13 px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50 neon-glow font-mono animate-pulse-glow">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          completed
                        </span>
                      )}
                    </div>
                    <Play className="h-5 w-5 text-[#39ff14] animate-pulse flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 md:p-8 text-center animate-fade-scale">
          <div className="relative inline-block mb-4">
            <Lock className="mx-auto h-16 w-16 text-[#39ff14] animate-pulse-glow" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-[#39ff14] rounded-full animate-ping"></span>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2 font-mono">
            <span className="text-[#39ff14]">if</span>{' '}
            <span className="text-white">(access === false)</span>{' '}
            <span className="text-[#39ff14]">return</span> <span className="text-red-400">'locked'</span>;
          </h3>
          <p className="text-gray-400 mb-6 font-mono">
            {course.studentCourseStatus === 'PENDING'
              ? '// Запрос ожидает одобрения'
              : '// Запросите доступ к курсу'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {trialLesson && (
              <button
                onClick={handleTrialLesson}
                className="glow-button inline-flex items-center px-6 py-3 border border-[#39ff14] text-[#39ff14] rounded-lg hover:bg-[#39ff14]/10 hover:neon-border transition-all font-mono relative z-10"
              >
                <Play className="h-5 w-5 mr-2" />
                trialLesson()
              </button>
            )}
            {course.studentCourseStatus !== 'PENDING' && (
              <button
                onClick={handleRequestAccess}
                disabled={requestAccessMutation.isLoading}
                className="glow-button inline-flex items-center px-6 py-3 border border-transparent text-black bg-gradient-primary rounded-lg hover:shadow-lg hover:shadow-[#39ff14]/70 transition-all disabled:opacity-50 font-mono font-bold relative z-10"
              >
                {requestAccessMutation.isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span>
                    <span>requesting...</span>
                  </span>
                ) : (
                  <span>requestAccess()</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <CoursePurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onConfirm={handleConfirmPurchase}
        courseTitle={course.title}
        coursePrice={course.price}
        teacherTelegram={course.teacher?.telegram}
        isLoading={requestAccessMutation.isLoading}
      />
    </div>
  );
}

