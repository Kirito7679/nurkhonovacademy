import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Course, Lesson } from '../types';
import { ArrowLeft, Save, Image as ImageIcon, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const courseSchema = z.object({
  title: z.string().min(1, 'Название курса обязательно'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('Неверный формат URL').optional().or(z.literal('')),
  price: z.number().min(0).default(0),
  trialLessonId: z.string().uuid().optional().or(z.literal('')),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CourseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const hasResetRef = useRef(false);

  const { data: courseResponse, isLoading } = useQuery(
    ['course', id],
    async () => {
      const response = await api.get<ApiResponse<Course & { lessons: Lesson[] }>>(`/courses/${id}`);
      return response.data.data;
    },
    { enabled: isEdit }
  );

  const createCourseMutation = useMutation(
    async (data: CourseFormData) => {
      const response = await api.post<ApiResponse<Course>>('/courses', data);
      return response.data.data;
    },
    {
      onSuccess: (course) => {
        queryClient.invalidateQueries('teacherCourses');
        navigate(`/teacher/courses/${course?.id}/edit`);
      },
    }
  );

  const updateCourseMutation = useMutation(
    async (data: CourseFormData) => {
      const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['course', id]);
        queryClient.invalidateQueries('teacherCourses');
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      thumbnailUrl: '',
      price: 0,
      trialLessonId: '',
    },
  });

  useEffect(() => {
    if (courseResponse && isEdit && !hasResetRef.current) {
      reset({
        title: courseResponse.title,
        description: courseResponse.description || '',
        thumbnailUrl: courseResponse.thumbnailUrl || '',
        price: courseResponse.price,
        trialLessonId: courseResponse.trialLessonId || '',
      });
      if (courseResponse.thumbnailUrl) {
        setThumbnailPreview(courseResponse.thumbnailUrl);
      }
      hasResetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseResponse, isEdit]);

  const onSubmit = (data: CourseFormData) => {
    if (isEdit) {
      updateCourseMutation.mutate(data);
    } else {
      createCourseMutation.mutate(data);
    }
  };

  if (isLoading) {
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

  const lessons = courseResponse?.lessons || [];

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setThumbnailPreview(url);
  };

  return (
    <div className="code-bg particle-bg">
      <button
        onClick={() => navigate('/teacher/courses')}
        className="flex items-center text-gray-400 hover:text-[#39ff14] mb-6 transition-all hover:neon-glow font-mono animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        <span className="text-[#39ff14]">return</span> courses
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow font-mono">
          <span className="text-[#39ff14]">
            {isEdit ? 'course.update()' : 'course.create()'}
          </span>
        </h1>
        <div className="absolute top-0 right-0 text-xs font-mono text-gray-600 animate-pulse">
          // {isEdit ? 'edit mode' : 'create mode'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                  placeholder="'Course Title'"
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
                  placeholder="// Course description..."
                />
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> thumbnailUrl <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <div className="space-y-3">
                  <input
                    {...register('thumbnailUrl')}
                    type="url"
                    onChange={(e) => {
                      handleThumbnailChange(e);
                      register('thumbnailUrl').onChange(e);
                    }}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                    placeholder="'https://...'"
                  />
                  {(thumbnailPreview || courseResponse?.thumbnailUrl) && (
                    <div className="relative rounded-lg overflow-hidden border border-[#374151] neon-border animate-fade-scale">
                      <img
                        src={thumbnailPreview || courseResponse?.thumbnailUrl}
                        alt="Course thumbnail"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                        <div className="flex items-center gap-2 text-[#39ff14] font-mono text-sm">
                          <ImageIcon className="h-4 w-4" />
                          <span>preview</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {errors.thumbnailUrl && (
                  <p className="mt-1 text-sm text-red-400 font-mono">{errors.thumbnailUrl.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> price <span className="text-[#00ff88]">=</span> <span className="text-gray-500">0</span>;
                </label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                  placeholder="0"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-400 font-mono">{errors.price.message}</p>
                )}
              </div>

              {isEdit && lessons.length > 0 && (
                <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                  <label htmlFor="trialLessonId" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                    <span className="text-[#39ff14]">const</span> trialLessonId <span className="text-[#00ff88]">=</span> <span className="text-gray-500">null</span>; <span className="text-gray-600">// optional</span>
                  </label>
                  <select
                    {...register('trialLessonId')}
                    className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                  >
                    <option value="">null</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="animate-slide-in" style={{ animationDelay: '0.6s' }}>
                <button
                  type="submit"
                  disabled={createCourseMutation.isLoading || updateCourseMutation.isLoading}
                  className="glow-button w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {createCourseMutation.isLoading || updateCourseMutation.isLoading
                    ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> <span>saving...</span></span>
                    : <span>save()</span>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {isEdit && (
          <div className="animate-fade-scale" style={{ animationDelay: '0.7s' }}>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 font-mono">
                <span className="text-[#39ff14]">const</span> lessons <span className="text-[#39ff14]">=</span> <span className="text-[#00ff88]">[]</span>;
              </h2>
              {lessons.length === 0 ? (
                <div className="text-center py-8 mb-4">
                  <div className="font-mono text-gray-500">
                    <span className="text-[#39ff14]">if</span>{' '}
                    <span className="text-white">(lessons.length === 0)</span>{' '}
                    <span className="text-[#39ff14]">return</span>{' '}
                    <span className="text-gray-500">'Нет уроков'</span>;
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 border border-[#374151] rounded-lg hover:border-[#39ff14]/50 hover:bg-[#1f2937]/50 transition-all animate-slide-in"
                      style={{ animationDelay: `${0.1 * index}s` }}
                    >
                      <span className="text-sm font-medium text-white font-mono">
                        <span className="text-[#39ff14]">{index + 1}</span>. {lesson.title}
                      </span>
                      <Link
                        to={`/teacher/courses/${id}/lessons/${lesson.id}/edit`}
                        className="text-[#39ff14] hover:text-[#00ff88] text-sm transition-all hover:neon-glow font-mono"
                      >
                        edit()
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              <Link
                to={`/teacher/courses/${id}/lessons/new`}
                className="glow-button block w-full text-center px-4 py-2 border border-[#39ff14]/50 text-[#39ff14] rounded-lg hover:bg-[#39ff14]/10 hover:neon-border transition-all font-mono relative z-10"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                addLesson()
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

