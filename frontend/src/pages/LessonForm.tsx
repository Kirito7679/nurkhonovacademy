import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Lesson, LessonFile } from '../types';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const lessonSchema = z.object({
  courseId: z.string().uuid('Неверный ID курса'),
  title: z.string().min(1, 'Название урока обязательно'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  videoUrl: z.string().url('Неверный формат URL').optional().or(z.literal('')),
});

type LessonFormData = z.infer<typeof lessonSchema>;

export default function LessonForm() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!lessonId;
  const [uploadingFile, setUploadingFile] = useState(false);
  const hasResetRef = useRef(false);

  const { data: lessonResponse, isLoading } = useQuery(
    ['lesson', lessonId],
    async () => {
      const response = await api.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
      return response.data.data;
    },
    { enabled: isEdit }
  );

  const { data: filesResponse } = useQuery(
    ['lessonFiles', lessonId],
    async () => {
      const response = await api.get<ApiResponse<LessonFile[]>>(`/lessons/${lessonId}/files`);
      return response.data.data || [];
    },
    { enabled: isEdit }
  );

  const createLessonMutation = useMutation(
    async (data: LessonFormData) => {
      const response = await api.post<ApiResponse<Lesson>>('/lessons', data);
      return response.data.data;
    },
    {
      onSuccess: (lesson) => {
        queryClient.invalidateQueries(['course', courseId]);
        navigate(`/teacher/courses/${courseId}/lessons/${lesson?.id}/edit`);
      },
    }
  );

  const updateLessonMutation = useMutation(
    async (data: LessonFormData) => {
      const response = await api.put<ApiResponse<Lesson>>(`/lessons/${lessonId}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lesson', lessonId]);
        queryClient.invalidateQueries(['course', courseId]);
      },
    }
  );

  const deleteFileMutation = useMutation(
    async (fileId: string) => {
      await api.delete(`/files/${fileId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonFiles', lessonId]);
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      courseId: courseId || '',
      title: '',
      description: '',
      order: 0,
      videoUrl: '',
    },
  });

  useEffect(() => {
    if (lessonResponse && isEdit && !hasResetRef.current) {
      reset({
        courseId: lessonResponse.courseId,
        title: lessonResponse.title,
        description: lessonResponse.description || '',
        order: lessonResponse.order,
        videoUrl: lessonResponse.videoUrl || '',
      });
      hasResetRef.current = true;
    } else if (courseId && !isEdit && !hasResetRef.current) {
      reset({
        courseId: courseId,
        title: '',
        description: '',
        order: 0,
        videoUrl: '',
      });
      hasResetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonResponse, courseId, isEdit]);

  const onSubmit = (data: LessonFormData) => {
    if (isEdit) {
      updateLessonMutation.mutate(data);
    } else {
      createLessonMutation.mutate(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lessonId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lessonId', lessonId);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      queryClient.invalidateQueries(['lessonFiles', lessonId]);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка при загрузке файла');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      deleteFileMutation.mutate(fileId);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 code-bg particle-bg">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
        </div>
        <p className="mt-4 text-gray-400 font-mono">loading lesson...</p>
      </div>
    );
  }

  const files = filesResponse || [];

  return (
    <div className="code-bg particle-bg">
      <button
        onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
        className="flex items-center text-gray-400 hover:text-[#39ff14] mb-6 transition-all hover:neon-glow font-mono animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        <span className="text-[#39ff14]">return</span> course
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow font-mono">
          <span className="text-[#39ff14]">
            {isEdit ? 'lesson.update()' : 'lesson.create()'}
          </span>
        </h1>
        <div className="absolute top-0 right-0 text-xs font-mono text-gray-600 animate-pulse">
          // {isEdit ? 'edit mode' : 'create mode'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6 animate-fade-scale">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> title <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                  placeholder="'Lesson Title'"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-400 font-mono">{errors.title.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> description <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                  placeholder="// Lesson description..."
                />
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="order" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> order <span className="text-[#00ff88]">=</span> <span className="text-gray-500">0</span>;
                </label>
                <input
                  {...register('order', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                />
                {errors.order && (
                  <p className="mt-1 text-sm text-red-400 font-mono">{errors.order.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> videoUrl <span className="text-[#00ff88]">=</span> <span className="text-gray-500">null</span>; <span className="text-gray-600">// YouTube URL</span>
                </label>
                <input
                  {...register('videoUrl')}
                  type="url"
                  placeholder="'https://www.youtube.com/watch?v=...'"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                />
                {errors.videoUrl && (
                  <p className="mt-1 text-sm text-red-400 font-mono">{errors.videoUrl.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 font-mono">
                  // Вставьте ссылку на YouTube видео
                </p>
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                <button
                  type="submit"
                  disabled={createLessonMutation.isLoading || updateLessonMutation.isLoading}
                  className="glow-button w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {createLessonMutation.isLoading || updateLessonMutation.isLoading
                    ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> <span>saving...</span></span>
                    : <span>save()</span>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {isEdit && (
          <div className="animate-fade-scale" style={{ animationDelay: '0.6s' }}>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 font-mono">
                <span className="text-[#39ff14]">const</span> files <span className="text-[#39ff14]">=</span> <span className="text-[#00ff88]">[]</span>;
              </h2>
              
              <div className="mb-4">
                <label className="block w-full">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                  <span className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-[#374151] rounded-lg hover:border-[#39ff14] cursor-pointer transition-all hover:bg-[#39ff14]/10 font-mono">
                    <Upload className="h-5 w-5 mr-2 text-[#39ff14] animate-pulse" />
                    {uploadingFile ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        <span>uploading...</span>
                      </span>
                    ) : (
                      <span>uploadFile()</span>
                    )}
                  </span>
                </label>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-4">
                  <div className="font-mono text-gray-500">
                    <span className="text-[#39ff14]">if</span>{' '}
                    <span className="text-white">(files.length === 0)</span>{' '}
                    <span className="text-[#39ff14]">return</span>{' '}
                    <span className="text-gray-500">'Нет файлов'</span>;
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-[#374151] rounded-lg hover:border-[#39ff14]/50 hover:bg-[#1f2937]/50 transition-all animate-slide-in"
                      style={{ animationDelay: `${0.1 * index}s` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate font-mono">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          <span className="text-[#00ff88]">{(file.fileSize / 1024 / 1024).toFixed(2)}</span> MB
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                        title="Удалить"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

