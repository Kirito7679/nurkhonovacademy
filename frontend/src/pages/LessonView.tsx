import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import ReactPlayer from 'react-player';
import api from '../services/api';
import { Lesson, ApiResponse, PracticeExercise, FlashcardDeck, ExternalIntegration, Course, Module } from '../types';
import { ArrowLeft, Download, CheckCircle, ChevronLeft, ChevronRight, Trash2, BookOpen, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { getVideoEmbedUrl, detectVideoSource } from '../utils/validation';
import CommentsSection from '../components/CommentsSection';
import LessonQuiz from '../components/Quiz';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { useState, useEffect } from 'react';
import { getCategoryLabel, getCategoryColor } from '../utils/courseUtils';

export default function LessonView() {
  const { t } = useTranslation();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; fileId: string | null }>({
    isOpen: false,
    fileId: null,
  });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  // Get lesson data
  const { data: lessonResponse, isLoading, error: lessonError } = useQuery(
    ['lesson', lessonId],
    async () => {
      const response = await api.get<ApiResponse<Lesson & { course: Course }>>(`/lessons/${lessonId}`);
      return response.data.data;
    },
    {
      enabled: !!lessonId,
      retry: 1,
    }
  );

  // Get course data for category
  const { data: courseResponse } = useQuery(
    ['course', courseId],
    async () => {
      const response = await api.get<ApiResponse<Course>>(`/courses/${courseId}`);
      return response.data.data;
    },
    { enabled: !!courseId }
  );

  // Get modules
  const { data: modulesResponse } = useQuery(
    ['modules', courseId],
    async () => {
      const response = await api.get<ApiResponse<Module[]>>(`/modules/courses/${courseId}/modules`);
      return response.data.data || [];
    },
    { enabled: !!courseId }
  );

  // Get all lessons in the course
  const { data: lessonsResponse } = useQuery(
    ['courseLessons', courseId],
    async () => {
      const response = await api.get<ApiResponse<Lesson[]>>(`/courses/${courseId}/lessons`);
      return response.data.data || [];
    },
    { enabled: !!courseId }
  );

  // Get practice exercises
  const { data: exercisesResponse } = useQuery(
    ['practiceExercises', lessonId],
    async () => {
      try {
        const response = await api.get<ApiResponse<PracticeExercise[]>>(`/practice/lessons/${lessonId}`);
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    { enabled: !!lessonId }
  );

  // Get flashcard decks
  const { data: flashcardDecksResponse } = useQuery(
    ['flashcardDecks', lessonId],
    async () => {
      try {
        const response = await api.get<ApiResponse<FlashcardDeck[]>>('/flashcards', {
          params: { lessonId },
        });
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    { enabled: !!lessonId }
  );

  // Get integrations
  const { data: integrationsResponse } = useQuery(
    ['integrations', lessonId],
    async () => {
      try {
        const response = await api.get<ApiResponse<ExternalIntegration[]>>('/integrations', {
          params: { lessonId },
        });
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    { enabled: !!lessonId }
  );

  const updateProgressMutation = useMutation(
    async (data: { completed?: boolean; lastPosition?: number }) => {
      const response = await api.put<ApiResponse<{ completed: boolean; lastPosition: number }>>(`/lessons/${lessonId}/progress`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lesson', lessonId]);
        queryClient.invalidateQueries(['courseLessons', courseId]);
      },
    }
  );

  const submitFeedbackMutation = useMutation(
    async (rating: number) => {
      // TODO: Implement feedback API endpoint
      try {
        await api.post(`/lessons/${lessonId}/feedback`, { rating });
      } catch (error) {
        // If endpoint doesn't exist, just log (non-critical feature)
        console.log('Feedback endpoint not implemented yet');
      }
    },
    {
      onSuccess: () => {
        // Keep rating visible after submission
      },
    }
  );

  const deleteFileMutation = useMutation(
    async (fileId: string) => {
      await api.delete(`/files/${fileId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lesson', lessonId]);
        setDeleteConfirm({ isOpen: false, fileId: null });
      },
    }
  );

  const canDeleteFile = (lesson: Lesson) => {
    if (!user) return false;
    return user.role === Role.TEACHER || user.role === Role.ADMIN || user.role === Role.CURATOR;
  };

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>, fileUrl: string, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
    try {
      let decodedFileName = fileName;
      try {
        if (/[ĐÑ€Ð£]/.test(fileName)) {
          const bytes = new Uint8Array(fileName.length);
          for (let i = 0; i < fileName.length; i++) {
            bytes[i] = fileName.charCodeAt(i) & 0xFF;
          }
          decodedFileName = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (/[ĐÑ€Ð£]/.test(decodedFileName)) {
            decodedFileName = decodeURIComponent(escape(fileName));
          }
        } else if (fileName.includes('%')) {
          try {
            decodedFileName = decodeURIComponent(fileName);
          } catch {
            decodedFileName = fileName;
          }
        }
      } catch {
        decodedFileName = fileName;
      }
      
      if (fileUrl.includes('supabase.co') || fileUrl.includes('cloudinary.com') || (fileUrl.startsWith('http') && !fileUrl.includes('/api/files/'))) {
        try {
          const response = await fetch(fileUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('Failed to fetch file');
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = decodedFileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            window.URL.revokeObjectURL(url);
          }, 100);
        } catch (fetchError) {
          console.error('Error fetching cloud file:', fetchError);
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = decodedFileName;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 100);
        }
      } else {
        const fileId = fileUrl.replace('/api/files/download/', '');
        const response = await api.get(`/files/download/${fileId}`, {
          responseType: 'blob',
        });
        
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = decodedFileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          window.URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      try {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 100);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
      }
    }
    
    return false;
  };

  const handleVideoProgress = (progress: { playedSeconds: number }) => {
    updateProgressMutation.mutate({ lastPosition: Math.floor(progress.playedSeconds) });
  };

  const handleVideoEnd = () => {
    updateProgressMutation.mutate({ completed: true });
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleFeedbackClick = (rating: number) => {
    setFeedbackRating(rating);
    submitFeedbackMutation.mutate(rating);
  };

  // Group lessons by modules
  const getLessonsByModule = () => {
    try {
      const lessons = lessonsResponse || [];
      const modules = modulesResponse || [];
      const lessonsByModule = new Map<string, Lesson[]>();
      const lessonsWithoutModule: Lesson[] = [];

      lessons.forEach((l) => {
        if (l?.moduleId) {
          if (!lessonsByModule.has(l.moduleId)) {
            lessonsByModule.set(l.moduleId, []);
          }
          lessonsByModule.get(l.moduleId)!.push(l);
        } else {
          lessonsWithoutModule.push(l);
        }
      });

      lessonsByModule.forEach((moduleLessons) => {
        moduleLessons.sort((a, b) => (a.order || 0) - (b.order || 0));
      });

      return { 
        lessonsByModule, 
        lessonsWithoutModule, 
        modules: modules.sort((a, b) => (a.order || 0) - (b.order || 0)) 
      };
    } catch (error) {
      console.error('Error grouping lessons by modules:', error);
      return { 
        lessonsByModule: new Map<string, Lesson[]>(), 
        lessonsWithoutModule: [], 
        modules: [] 
      };
    }
  };

  // Check if lesson is accessible (completed or has access)
  const isLessonAccessible = (lesson: Lesson): boolean => {
    if (!user || user.role !== 'STUDENT') return true;
    if (lesson.progress?.completed) return true;
    
    // Check if it's the first lesson or previous is completed
    const lessons = lessonsResponse || [];
    const sortedLessons = [...lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sortedLessons.findIndex(l => l.id === lesson.id);
    
    if (currentIndex === 0) return true;
    if (currentIndex > 0) {
      const previousLesson = sortedLessons[currentIndex - 1];
      return previousLesson.progress?.completed || false;
    }
    
    return false;
  };

  // Auto-expand module containing current lesson (must be before conditional returns!)
  useEffect(() => {
    if (lessonResponse?.moduleId) {
      setExpandedModules(prev => {
        if (!prev.has(lessonResponse.moduleId!)) {
          return new Set([...prev, lessonResponse.moduleId!]);
        }
        return prev;
      });
    }
  }, [lessonId, lessonResponse?.moduleId]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (lessonError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">
          {lessonError instanceof Error ? lessonError.message : 'Ошибка при загрузке урока'}
        </p>
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="btn-primary"
        >
          Вернуться к курсу
        </button>
      </div>
    );
  }

  const lesson = lessonResponse;
  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 mb-4">{t('errors.notFound')}</p>
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="btn-primary"
        >
          Вернуться к курсу
        </button>
      </div>
    );
  }

  const course = courseResponse;
  const { lessonsByModule, lessonsWithoutModule, modules } = getLessonsByModule();
  const lessons = lessonsResponse || [];
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const videoUrl = lesson.videoUrl ? getVideoEmbedUrl(lesson.videoUrl) : null;
  const videoSource = lesson.videoUrl ? detectVideoSource(lesson.videoUrl) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content Area - Left */}
      <div className="flex-1 space-y-6">
        {/* Back Button and Title */}
        <div>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center text-neutral-600 hover:text-primary-600 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Назад
          </button>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 mb-3 break-words">
            {lesson.title}
          </h1>

          {/* Course Category Badge */}
          {course?.category && (
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${getCategoryColor(course.category)}`}>
                {getCategoryLabel(course.category)}
              </span>
            </div>
          )}
        </div>

        {/* Video Player */}
        {videoUrl && (
          <div className="w-full bg-neutral-900 rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-video">
              {videoSource === 'google-drive' ? (
                <iframe
                  src={videoUrl || ''}
                  width="100%"
                  height="100%"
                  allow="autoplay"
                  style={{ border: 'none' }}
                  allowFullScreen
                />
              ) : (
                <ReactPlayer
                  url={lesson.videoUrl || ''}
                  width="100%"
                  height="100%"
                  controls
                  onProgress={handleVideoProgress}
                  onEnded={handleVideoEnd}
                  config={{
                    youtube: {
                      playerVars: {
                        start: lesson.progress?.lastPosition || 0,
                      },
                    },
                    vimeo: {
                      playerOptions: {
                        start: lesson.progress?.lastPosition || 0,
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Как прошел урок?</h3>
          <p className="text-sm text-neutral-600 mb-4">Нам важна Ваша обратная связь</p>
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleFeedbackClick(rating)}
                className={`text-4xl transition-transform hover:scale-110 ${
                  feedbackRating === rating ? 'scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                disabled={submitFeedbackMutation.isLoading}
              >
                {rating === 1 && '😢'}
                {rating === 2 && '😕'}
                {rating === 3 && '😐'}
                {rating === 4 && '🙂'}
                {rating === 5 && '😄'}
              </button>
            ))}
          </div>
        </div>

        {/* Files Section */}
        {lesson.files && lesson.files.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
              {t('lessons.files', { defaultValue: 'Файлы урока' })}
            </h2>
            <div className="space-y-3">
              {lesson.files.map((file) => {
                const isVideo = /\.(mp4|webm|mov|avi|wmv|flv|mpeg)$/i.test(file.fileName);
                const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(file.fileName);
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
                
                return (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 md:p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-primary-300 transition-all group"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 mr-3">
                        {isDocument ? (
                          <Download className="h-5 w-5 text-blue-500" />
                        ) : isVideo ? (
                          <BookOpen className="h-5 w-5 text-purple-500" />
                        ) : isImage ? (
                          <Download className="h-5 w-5 text-green-500" />
                        ) : (
                          <Download className="h-5 w-5 text-primary-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate" title={file.fileName}>
                          {(() => {
                            try {
                              const fileName = file.fileName;
                              if (/[ĐÑ€Ð£]/.test(fileName)) {
                                const bytes = new Uint8Array(fileName.length);
                                for (let i = 0; i < fileName.length; i++) {
                                  bytes[i] = fileName.charCodeAt(i) & 0xFF;
                                }
                                const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                                if (/[ĐÑ€Ð£]/.test(decoded)) {
                                  return decodeURIComponent(escape(fileName));
                                }
                                return decoded;
                              }
                              return fileName;
                            } catch {
                              return file.fileName;
                            }
                          })()}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {t('lessons.fileSize', { defaultValue: 'Размер' })}: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(e, file.fileUrl, file.fileName);
                        }}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {isVideo ? 'Смотреть' : 'Скачать'}
                      </button>
                      {canDeleteFile(lesson) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirm({ isOpen: true, fileId: file.id });
                          }}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-2"
                          title="Удалить файл"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Удалить</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Practice Exercises */}
        {exercisesResponse && exercisesResponse.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-6">
              {t('practice.title')}
            </h2>
            <div className="space-y-6">
              {exercisesResponse.map((exercise) => (
                <div key={exercise.id} className="p-4 border border-neutral-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{exercise.title}</h3>
                  {exercise.description && (
                    <p className="text-neutral-600 mb-4">{exercise.description}</p>
                  )}
                  <Link
                    to={`/lessons/${lessonId}/practice`}
                    className="btn-primary text-sm"
                  >
                    {t('practice.execute', { defaultValue: 'Выполнить упражнение' })}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flashcards */}
        {flashcardDecksResponse && flashcardDecksResponse.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
              {t('flashcards.title')}
            </h2>
            <div className="space-y-4">
              {flashcardDecksResponse.map((deck) => (
                <div key={deck.id} className="p-4 border border-neutral-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{deck.title}</h3>
                  {deck.description && (
                    <p className="text-neutral-600 mb-4 text-sm">{deck.description}</p>
                  )}
                  <Link
                    to={`/flashcards/${deck.id}/study`}
                    className="btn-primary text-sm"
                  >
                    {t('flashcards.study')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz */}
        <div>
          <LessonQuiz 
            lessonId={lessonId!}
            onComplete={(result) => {
              if (result.passed) {
                queryClient.invalidateQueries(['lesson', lessonId]);
              }
            }}
          />
        </div>

        {/* Comments */}
        <CommentsSection lessonId={lessonId!} />

        {/* Next Lesson Button */}
        {nextLesson && (
          <button
            onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
            className="w-full bg-neutral-800 hover:bg-neutral-900 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>Следующий урок</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Sidebar - Right */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm sticky top-6">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-semibold text-neutral-900">Программа курса</h3>
          </div>
          <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Modules */}
            {modules.map((module) => {
              const moduleLessons = lessonsByModule.get(module.id) || [];
              const isExpanded = expandedModules.has(module.id);
              
              return (
                <div key={module.id} className="mb-2">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <BookOpen className="h-5 w-5 text-primary-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-900 truncate">{module.title}</div>
                        <div className="text-xs text-neutral-500">{moduleLessons.length} уроков</div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {moduleLessons.map((l, index) => {
                        const isCurrent = l.id === lessonId;
                        const isAccessible = isLessonAccessible(l);
                        const isCompleted = l.progress?.completed || false;
                        
                        return (
                          <Link
                            key={l.id}
                            to={`/courses/${courseId}/lessons/${l.id}`}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              isCurrent
                                ? 'bg-primary-50 border-l-4 border-primary-600'
                                : 'hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm text-neutral-500 flex-shrink-0">
                                {String(index + 1).padStart(2, '0')}.
                              </span>
                              <span className={`text-sm truncate ${isCurrent ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                                {l.title}
                              </span>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {isAccessible ? (
                                <CheckCircle className={`h-4 w-4 ${isCompleted ? 'text-green-500' : 'text-neutral-400'}`} />
                              ) : (
                                <Lock className="h-4 w-4 text-neutral-300" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Lessons without module */}
            {lessonsWithoutModule.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-neutral-500 mb-2 px-3">Без модуля</div>
                <div className="space-y-1">
                  {lessonsWithoutModule.map((l) => {
                    const isCurrent = l.id === lessonId;
                    const isAccessible = isLessonAccessible(l);
                    const isCompleted = l.progress?.completed || false;
                    
                    return (
                      <Link
                        key={l.id}
                        to={`/courses/${courseId}/lessons/${l.id}`}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-primary-50 border-l-4 border-primary-600'
                            : 'hover:bg-neutral-50'
                        }`}
                      >
                        <span className={`text-sm truncate ${isCurrent ? 'font-semibold text-primary-700' : 'text-neutral-700'}`}>
                          {l.title}
                        </span>
                        <div className="flex-shrink-0 ml-2">
                          {isAccessible ? (
                            <CheckCircle className={`h-4 w-4 ${isCompleted ? 'text-green-500' : 'text-neutral-400'}`} />
                          ) : (
                            <Lock className="h-4 w-4 text-neutral-300" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete File Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, fileId: null })}
        onConfirm={() => {
          if (deleteConfirm.fileId) {
            deleteFileMutation.mutate(deleteConfirm.fileId);
          }
        }}
        title="Удалить файл"
        message="Вы уверены, что хотите удалить этот файл? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}
