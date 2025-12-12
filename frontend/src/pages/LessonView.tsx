import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import ReactPlayer from 'react-player';
import api from '../services/api';
import { Lesson, ApiResponse, PracticeExercise, FlashcardDeck, ExternalIntegration } from '../types';
import { ArrowLeft, Download, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVideoEmbedUrl, detectVideoSource } from '../utils/validation';
import CommentsSection from '../components/CommentsSection';
import LessonQuiz from '../components/Quiz';

export default function LessonView() {
  const { t } = useTranslation();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lessonResponse, isLoading } = useQuery(
    ['lesson', lessonId],
    async () => {
      const response = await api.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
      return response.data.data;
    }
  );

  // Get practice exercises for the lesson
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

  // Get flashcard decks for the lesson
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

  // Get integrations for the lesson
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


  // Get all lessons in the course to find previous/next
  const { data: lessonsResponse } = useQuery(
    ['courseLessons', courseId],
    async () => {
      const response = await api.get<ApiResponse<Lesson[]>>(`/courses/${courseId}/lessons`);
      return response.data.data || [];
    },
    { enabled: !!courseId }
  );

  const updateProgressMutation = useMutation(
    async (data: { completed?: boolean; lastPosition?: number }) => {
      const response = await api.put<ApiResponse<{ completed: boolean; lastPosition: number }>>(`/lessons/${lessonId}/progress`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lesson', lessonId]);
      },
    }
  );

  const handleDownload = (fileUrl: string, fileName: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleVideoProgress = (progress: { playedSeconds: number }) => {
    updateProgressMutation.mutate({ lastPosition: Math.floor(progress.playedSeconds) });
  };

  const handleVideoEnd = () => {
    updateProgressMutation.mutate({ completed: true });
  };

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

  const lesson = lessonResponse;
  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">{t('errors.notFound')}</p>
      </div>
    );
  }

  // Find previous and next lessons
  const lessons = lessonsResponse || [];
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const videoUrl = lesson.videoUrl ? getVideoEmbedUrl(lesson.videoUrl) : null;
  const videoSource = lesson.videoUrl ? detectVideoSource(lesson.videoUrl) : null;

  return (
    <div>
      <button
        onClick={() => navigate(`/courses/${courseId}`)}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors group"
      >
        <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Назад к курсу
      </button>

      <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-gradient mb-4 break-words">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="text-neutral-600 mb-6">
            {lesson.description}
          </p>
        )}
        {lesson.progress?.completed && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="h-4 w-4 mr-1 text-green-700" />
            {t('lessons.completed')}
          </div>
        )}
      </div>

      {videoUrl && (
        <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            {t('lessons.videoLesson', { defaultValue: 'Видео урок' })}
          </h2>
          <div className="aspect-video">
            {videoSource === 'google-drive' ? (
              // Google Drive requires iframe
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

      {lesson.files && lesson.files.length > 0 && (
        <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            {t('lessons.files', { defaultValue: 'Файлы урока' })}
          </h2>
          <div className="space-y-3">
            {lesson.files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 md:p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-primary-300 transition-all group"
              >
                <div className="flex items-center">
                  <Download className="h-5 w-5 text-primary-500 mr-3" />
                  <div>
                    <p className="font-medium text-neutral-900">{file.fileName}</p>
                    <p className="text-sm text-neutral-500">
                      {t('lessons.fileSize', { defaultValue: 'Размер' })}: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file.fileUrl, file.fileName)}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Скачать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Integrations Section */}
      {integrationsResponse && integrationsResponse.length > 0 && (
        <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.22s' }}>
          <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-4">
            {t('lessons.additionalMaterials', { defaultValue: 'Дополнительные материалы' })}
          </h2>
          <div className="space-y-4">
            {integrationsResponse.map((integration) => (
              <div key={integration.id} className="p-4 border border-neutral-200 rounded-lg">
                <h3 className="font-semibold text-neutral-900 mb-2">{integration.type}</h3>
                <a
                  href={integration.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm inline-flex items-center gap-2"
                >
                  {t('integrations.open')} {integration.type}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Exercises Section */}
      {exercisesResponse && exercisesResponse.length > 0 && (
        <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.23s' }}>
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
                <p className="text-sm text-neutral-500 mb-4">{exercise.instructions}</p>
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

      {/* Flashcards Section */}
      {flashcardDecksResponse && flashcardDecksResponse.length > 0 && (
        <div className="card rounded-lg shadow-soft border border-neutral-200 p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.24s' }}>
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
                <p className="text-sm text-neutral-500 mb-4">
                  {deck._count?.flashcards || 0} карточек
                </p>
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

      {/* Quiz Section */}
      <div className="mb-6 animate-fade-scale" style={{ animationDelay: '0.25s' }}>
        <LessonQuiz 
          lessonId={lessonId!}
          onComplete={(result) => {
            // Optionally update lesson progress when quiz is passed
            if (result.passed) {
              queryClient.invalidateQueries(['lesson', lessonId]);
            }
          }}
        />
      </div>

      {/* Comments Section */}
      <CommentsSection lessonId={lessonId!} />

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mt-6 md:mt-8 animate-fade-scale" style={{ animationDelay: '0.3s' }}>
        {previousLesson ? (
          <button
            onClick={() => navigate(`/courses/${courseId}/lessons/${previousLesson.id}`)}
            className="btn-secondary group flex items-center gap-3 flex-1"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <div className="flex-1 text-left">
              <div className="text-xs text-neutral-500 mb-1">
                {t('lessons.previousLesson', { defaultValue: 'Предыдущий урок' })}
              </div>
              <div className="font-semibold truncate">{previousLesson.title}</div>
            </div>
          </button>
        ) : (
          <div className="flex-1"></div>
        )}

        {nextLesson ? (
          <button
            onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
            className="btn-secondary group flex items-center gap-3 flex-1"
          >
            <div className="flex-1 text-right">
              <div className="text-xs text-neutral-500 mb-1">
                {t('lessons.nextLesson', { defaultValue: 'Следующий урок' })}
              </div>
              <div className="font-semibold truncate">{nextLesson.title}</div>
            </div>
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex-1"></div>
        )}
      </div>
    </div>
  );
}
