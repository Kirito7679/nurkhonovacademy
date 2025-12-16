import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Course, Lesson, ApiResponse, StudentCourseStatus, Module, IntermediateTest, Role } from '../types';
import { Play, Lock, CheckCircle, BookOpen, Clock, User, ArrowRight, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import CoursePurchaseModal from '../components/CoursePurchaseModal';
import Banner from '../components/Banner';
import { useAuthStore } from '../store/authStore';

export default function CourseDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showLessons, setShowLessons] = useState(true);

  const { data: courseResponse, isLoading: courseLoading } = useQuery(
    ['course', id],
    async () => {
      const response = await api.get<ApiResponse<Course & { lessons: Lesson[] }>>(`/courses/${id}`);
      return response.data.data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      enabled: !!id,
    }
  );

  const { data: lessonsResponse, isLoading: lessonsLoading } = useQuery(
    ['courseLessons', id],
    async () => {
      const response = await api.get<ApiResponse<Lesson[]>>(`/courses/${id}/lessons`);
      return response.data.data || [];
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      enabled: !!id,
    }
  );

  const { data: modulesResponse, isLoading: modulesLoading } = useQuery(
    ['modules', id],
    async () => {
      const response = await api.get<ApiResponse<Module[]>>(`/modules/courses/${id}/modules`);
      return response.data.data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // Modules change rarely
      cacheTime: 20 * 60 * 1000,
      enabled: !!id,
    }
  );

  // Определяем, можно ли запрашивать тесты
  // Запрос отправляется только если:
  // 1. Курс загружен
  // 2. И (учитель/админ ИЛИ студент с APPROVED доступом)
  const canAccessTests = courseResponse && !courseLoading && (
    // Админы и кураторы могут видеть все тесты
    user?.role === Role.ADMIN || user?.role === Role.CURATOR ||
    // Учителя могут видеть тесты своих курсов
    (user?.role === Role.TEACHER && courseResponse.teacherId === user.id) ||
    // Студенты могут видеть тесты только если есть APPROVED доступ
    (user?.role === Role.STUDENT && 
     courseResponse.hasAccess === true && 
     courseResponse.studentCourseStatus === StudentCourseStatus.APPROVED)
  );

  const { data: testsResponse } = useQuery(
    ['tests', id],
    async () => {
      try {
        const response = await api.get<ApiResponse<IntermediateTest[]>>(`/tests/courses/${id}/tests`);
        return response.data.data || [];
      } catch (error: any) {
        // Если 403 - нет доступа, это нормально, возвращаем пустой массив
        if (error.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      enabled: !!id && !!canAccessTests, // Запрос отправляется только если есть доступ
      retry: false, // Не повторять запрос при ошибке доступа
    }
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
  const modules = modulesResponse || [];
  const tests = testsResponse || [];
  const trialLesson = course?.trialLessonId
    ? lessons.find((l) => l.id === course.trialLessonId)
    : null;

  // Calculate completed lessons count
  const completedLessons = lessons.filter(l => l.progress?.completed).length;
  const progressPercentage = lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  // Group lessons by modules
  const getLessonsByModule = () => {
    const lessonsByModule = new Map<string, Lesson[]>();
    const lessonsWithoutModule: Lesson[] = [];

    lessons.forEach((lesson) => {
      if (lesson.moduleId) {
        if (!lessonsByModule.has(lesson.moduleId)) {
          lessonsByModule.set(lesson.moduleId, []);
        }
        lessonsByModule.get(lesson.moduleId)!.push(lesson);
      } else {
        lessonsWithoutModule.push(lesson);
      }
    });

    // Sort lessons within each module by order
    lessonsByModule.forEach((moduleLessons) => {
      moduleLessons.sort((a, b) => a.order - b.order);
    });

    // Sort lessons without module by order
    lessonsWithoutModule.sort((a, b) => a.order - b.order);

    return { lessonsByModule, lessonsWithoutModule };
  };

  const { lessonsByModule, lessonsWithoutModule } = getLessonsByModule();

  if (courseLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12 animate-fade-scale">
        <p className="text-neutral-600">{t('errors.notFound')}</p>
      </div>
    );
  }

  const handleRequestAccess = () => {
    // Show modal for all courses (both free and paid)
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = () => {
    requestAccessMutation.mutate();
  };

  const handleTrialLesson = () => {
    if (trialLesson) {
      navigate(`/courses/${id}/lessons/${trialLesson.id}`);
    }
  };


  return (
    <div>
      {/* Banner Top */}
      <Banner position="TOP" />

      {/* Course Banner */}
      {course.thumbnailUrl && (
        <div className="relative w-full h-48 md:h-64 lg:h-80 mb-8 rounded-lg overflow-hidden animate-fade-scale">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 break-words">
              {course.title}
            </h1>
            {course.teacher && (
              <div className="flex items-center text-white/90 text-sm md:text-base">
                <User className="h-4 w-4 mr-2" />
                <span>{t('courses.teacher', { defaultValue: 'Преподаватель' })}: {course.teacher.firstName} {course.teacher.lastName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Info Section */}
      <div className="mb-8 animate-slide-in">
        {!course.thumbnailUrl && (
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient mb-4 break-words">
            {course.title}
          </h1>
        )}
        
        {/* Course Stats */}
        {course.hasAccess && lessons.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center">
              <BookOpen className="h-6 w-6 text-primary-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-neutral-900">{lessons.length}</div>
              <div className="text-sm text-neutral-600">{t('lessons.title')}</div>
            </div>
            <div className="card p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-neutral-900">{completedLessons}</div>
              <div className="text-sm text-neutral-600">{t('lessons.completed')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="h-6 w-6 mx-auto mb-2 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500" style={{ 
                  background: `conic-gradient(from 0deg, #39ff14 ${progressPercentage * 3.6}deg, #e5e7eb ${progressPercentage * 3.6}deg)` 
                }}></div>
              </div>
              <div className="text-2xl font-bold text-neutral-900">{progressPercentage}%</div>
              <div className="text-sm text-neutral-600">{t('dashboard.overallProgress', { defaultValue: 'Прогресс' })}</div>
            </div>
            <div className="card p-4 text-center">
              <Clock className="h-6 w-6 text-primary-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-neutral-900">{modules.length}</div>
              <div className="text-sm text-neutral-600">{t('modules.title')}</div>
            </div>
          </div>
        )}

        {/* Course Description */}
        {course.description && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-4">{t('courses.aboutCourse', { defaultValue: 'О курсе' })}</h2>
            <p className="text-neutral-600 text-sm md:text-base lg:text-lg leading-relaxed break-words whitespace-pre-line">
              {course.description}
            </p>
          </div>
        )}

        {/* Intermediate Tests */}
        {course.hasAccess && tests.length > 0 && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-6">Промежуточные тесты</h2>
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900">{test.title}</h3>
                    {test.description && (
                      <p className="text-sm text-neutral-600 mt-1">{test.description}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-2">
                      Проходной балл: {test.passingScore}% • 
                      {test.timeLimit ? ` Время: ${test.timeLimit} мин` : ' Без ограничения времени'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/courses/${id}/tests/${test.id}`)}
                    className="btn-primary text-sm ml-4"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Пройти тест
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course Modules/Program */}
        {course.hasAccess && modules.length > 0 && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-6">{t('courses.program', { defaultValue: 'Программа обучения' })}</h2>
            <div className="space-y-4">
              {modules
                .sort((a, b) => a.order - b.order)
                .map((module, moduleIndex) => {
                  const moduleLessons = lessonsByModule.get(module.id) || [];
                  if (moduleLessons.length === 0) return null;
                  
                  // Calculate start index for lessons in this module
                  let startIndex = 1;
                  for (let i = 0; i < moduleIndex; i++) {
                    const prevModuleLessons = lessonsByModule.get(modules[i].id) || [];
                    startIndex += prevModuleLessons.length;
                  }
                  
                  return (
                    <div key={module.id} className="border-l-4 border-primary-500 pl-4 md:pl-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-white font-bold text-lg flex-shrink-0">
                          {moduleIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-neutral-900">{module.title}</h3>
                          {module.description && (
                            <p className="text-sm text-neutral-500 mt-1">{module.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-neutral-500 ml-auto">
                          {moduleLessons.length} {t('lessons.lessonsCount', { count: moduleLessons.length, defaultValue: moduleLessons.length === 1 ? 'урок' : 'уроков' })}
                        </span>
                      </div>
                      <div className="ml-12 md:ml-14 space-y-2">
                        {moduleLessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition-colors"
                          >
                            <span className="text-sm font-medium w-6">{startIndex + lessonIndex}.</span>
                            <span className="text-sm md:text-base">{lesson.title}</span>
                            {lesson.progress?.completed && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              {lessonsWithoutModule.length > 0 && (
                <div className="border-l-4 border-neutral-300 pl-4 md:pl-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg md:text-xl font-semibold text-neutral-900">{t('modules.additionalLessons', { defaultValue: 'Дополнительные уроки' })}</h3>
                    <span className="text-sm text-neutral-500 ml-auto">
                      {lessonsWithoutModule.length} {t('lessons.lessonsCount', { count: lessonsWithoutModule.length, defaultValue: lessonsWithoutModule.length === 1 ? 'урок' : 'уроков' })}
                    </span>
                  </div>
                  <div className="ml-12 md:ml-14 space-y-2">
                    {lessonsWithoutModule.map((lesson, lessonIndex) => {
                      // Calculate index for lessons without module
                      let globalLessonIndex = 1;
                      modules.forEach((m) => {
                        const mLessons = lessonsByModule.get(m.id) || [];
                        globalLessonIndex += mLessons.length;
                      });
                      globalLessonIndex += lessonIndex;
                      
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 transition-colors"
                        >
                          <span className="text-sm font-medium w-6">{globalLessonIndex}.</span>
                          <span className="text-sm md:text-base">{lesson.title}</span>
                          {lesson.progress?.completed && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lessons Section */}
      <div className="animate-fade-scale">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
            {t('courses.courseLessons', { defaultValue: 'Уроки курса' })}
          </h2>
          {lessons.length > 0 && (
            <button
              onClick={() => setShowLessons(!showLessons)}
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors text-sm md:text-base"
            >
              {showLessons ? (
                <>
                  <span>{t('common.close')}</span>
                  <ChevronUp className="h-5 w-5" />
                </>
              ) : (
                <>
                  <span>{t('courses.showAll', { defaultValue: 'Показать все' })}</span>
                  <ChevronDown className="h-5 w-5" />
                </>
              )}
            </button>
          )}
        </div>
        
        {lessonsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
            </div>
            <p className="mt-4 text-neutral-600">{t('common.loading')}</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12 animate-fade-scale">
            <p className="text-neutral-500">{t('lessons.noLessons')}</p>
          </div>
        ) : (
          <>
            {!course.hasAccess && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{t('courses.trialLessons', { defaultValue: 'Пробные уроки' })}</span> {t('courses.trialLessonsDescription', { defaultValue: 'доступны для просмотра. Для доступа ко всем урокам запросите доступ к курсу.' })}
                </p>
              </div>
            )}
            <div className="space-y-4">
              {(showLessons ? lessons : lessons.slice(0, 5)).map((lesson, index) => {
                const isTrialLesson = course?.trialLessonId === lesson.id;
                const hasLessonAccess = course.hasAccess || isTrialLesson;
                const isLocked = !hasLessonAccess;

                return (
                  <div
                    key={lesson.id}
                    className={`card p-4 md:p-6 animate-slide-in group ${
                      isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'card-hover cursor-pointer'
                    }`}
                    style={{ animationDelay: `${0.1 * index}s` }}
                    onClick={() => {
                      if (!isLocked) {
                        navigate(`/courses/${id}/lessons/${lesson.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3 mb-2">
                          <span className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-semibold text-sm md:text-base flex-shrink-0 transition-transform ${
                            isLocked
                              ? 'bg-neutral-300 text-neutral-600'
                              : 'bg-gradient-primary text-white group-hover:scale-110'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <h3 className={`text-base md:text-lg font-semibold break-words transition-colors ${
                              isLocked
                                ? 'text-neutral-500'
                                : 'text-neutral-900 group-hover:text-primary-600'
                            }`}>
                              {lesson.title}
                            </h3>
                            {isTrialLesson && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                {t('courses.trial', { defaultValue: 'Пробный' })}
                              </span>
                            )}
                            {isLocked && (
                              <Lock className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        {lesson.description && (
                          <p className={`text-xs md:text-sm ml-10 md:ml-12 break-words line-clamp-2 ${
                            isLocked ? 'text-neutral-400' : 'text-neutral-600'
                          }`}>
                            {lesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-10 md:ml-12">
                          {lesson.progress?.completed && (
                            <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1 text-green-700" />
                              {t('lessons.completed')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked ? (
                          <Lock className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                        ) : (
                          <>
                            <Play className="h-5 w-5 text-primary-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!showLessons && lessons.length > 5 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowLessons(true)}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  {t('courses.showAllLessons', { count: lessons.length, defaultValue: `Показать все ${lessons.length} уроков` })}
                </button>
              </div>
            )}
            
            {!course.hasAccess && (
              <div className="mt-6 card p-4 md:p-6 text-center">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  {course.studentCourseStatus !== 'PENDING' && (
                    <button
                      onClick={handleRequestAccess}
                      disabled={requestAccessMutation.isLoading}
                      className="btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requestAccessMutation.isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>{t('common.loading')}</span>
                        </span>
                      ) : (
                        <span>
                          {course.price === 0 
                            ? t('courses.startCourse', { defaultValue: 'Пройти курс' })
                            : t('courses.requestAccess', { defaultValue: 'Запросить доступ к курсу' })
                          }
                        </span>
                      )}
                    </button>
                  )}
                  {course.studentCourseStatus === 'PENDING' && (
                    <div className="text-neutral-600">
                      <p className="font-medium mb-2">{t('courses.requestPending', { defaultValue: 'Запрос ожидает одобрения' })}</p>
                      <p className="text-sm">{t('courses.requestPendingDescription', { defaultValue: 'Вы получите уведомление, когда доступ будет предоставлен' })}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

