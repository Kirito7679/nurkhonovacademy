import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import ReactPlayer from 'react-player/youtube';
import api from '../services/api';
import { Lesson, ApiResponse } from '../types';
import { ArrowLeft, Download, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getYouTubeEmbedUrl } from '../utils/validation';
import CommentsSection from '../components/CommentsSection';

export default function LessonView() {
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
      const response = await api.put<ApiResponse<any>>(`/lessons/${lessonId}/progress`, data);
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
        </div>
        <p className="mt-4 text-gray-400 font-mono">loading lesson...</p>
      </div>
    );
  }

  const lesson = lessonResponse;
  if (!lesson) {
    return (
      <div className="text-center py-12">
        <div className="font-mono text-gray-400">
          <span className="text-[#39ff14]">if</span>{' '}
          <span className="text-white">(!lesson)</span>{' '}
          <span className="text-[#39ff14]">return</span>{' '}
          <span className="text-gray-500">'Урок не найден'</span>;
        </div>
      </div>
    );
  }

  // Find previous and next lessons
  const lessons = lessonsResponse || [];
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const videoUrl = lesson.videoUrl ? getYouTubeEmbedUrl(lesson.videoUrl) : null;

  return (
    <div className="code-bg particle-bg">
      <button
        onClick={() => navigate(`/courses/${courseId}`)}
        className="flex items-center text-gray-400 hover:text-[#39ff14] mb-6 transition-colors font-mono group"
      >
        <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="text-[#39ff14]">return</span> to course
      </button>

      <div className="card rounded-lg shadow-sm border border-[#374151] p-4 md:p-6 mb-6 animate-fade-scale">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-gradient neon-glow font-mono mb-4 break-words">
          <span className="text-[#39ff14]">const</span> lesson <span className="text-[#39ff14]">=</span>{' '}
          <span className="text-white">'{lesson.title}'</span>;
        </h1>
        {lesson.description && (
          <p className="text-gray-400 mb-6 font-mono">
            <span className="text-[#39ff14]">//</span> {lesson.description}
          </p>
        )}
        {lesson.progress?.completed && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50 neon-glow font-mono animate-pulse-glow">
            <CheckCircle className="h-4 w-4 mr-1" />
            completed
          </div>
        )}
      </div>

      {videoUrl && (
        <div className="card rounded-lg shadow-sm border border-[#374151] p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 font-mono">
            <span className="text-[#39ff14]">const</span> video <span className="text-[#39ff14]">=</span>{' '}
            <span className="text-white">'Видео урок'</span>;
          </h2>
          <div className="aspect-video">
            <ReactPlayer
              url={videoUrl}
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
              }}
            />
          </div>
        </div>
      )}

      {lesson.files && lesson.files.length > 0 && (
        <div className="card rounded-lg shadow-sm border border-[#374151] p-4 md:p-6 mb-6 animate-fade-scale" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 font-mono">
            <span className="text-[#39ff14]">const</span> files <span className="text-[#39ff14]">=</span>{' '}
            <span className="text-white">[]</span>;
          </h2>
          <div className="space-y-3">
            {lesson.files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 md:p-4 border border-[#374151] rounded-lg hover:bg-[#1f2937] hover:border-[#39ff14]/50 transition-all group"
              >
                <div className="flex items-center">
                  <Download className="h-5 w-5 text-[#39ff14] mr-3 group-hover:animate-bounce" />
                  <div>
                    <p className="font-medium text-white font-mono">{file.fileName}</p>
                    <p className="text-sm text-gray-500 font-mono">
                      <span className="text-[#39ff14]">size:</span> {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file.fileUrl, file.fileName)}
                  className="px-4 py-2 text-sm font-medium text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all font-mono"
                >
                  download()
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <CommentsSection lessonId={lessonId!} />

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mt-6 md:mt-8 animate-fade-scale" style={{ animationDelay: '0.3s' }}>
        {previousLesson ? (
          <button
            onClick={() => navigate(`/courses/${courseId}/lessons/${previousLesson.id}`)}
            className="group flex items-center gap-3 px-6 py-3 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all font-mono font-medium relative overflow-hidden flex-1"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <ChevronLeft className="h-5 w-5 relative z-10 group-hover:-translate-x-1 transition-transform" />
            <div className="flex-1 text-left relative z-10">
              <div className="text-xs text-gray-500 mb-1">
                <span className="text-[#39ff14]">prev</span> lesson
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
            className="group flex items-center gap-3 px-6 py-3 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all font-mono font-medium relative overflow-hidden flex-1"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[100%] group-hover:translate-x-[-100%] transition-transform duration-700"></span>
            <div className="flex-1 text-right relative z-10">
              <div className="text-xs text-gray-500 mb-1">
                <span className="text-[#39ff14]">next</span> lesson
              </div>
              <div className="font-semibold truncate">{nextLesson.title}</div>
            </div>
            <ChevronRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex-1"></div>
        )}
      </div>
    </div>
  );
}
