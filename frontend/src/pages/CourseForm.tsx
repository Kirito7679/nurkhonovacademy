import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Course, Lesson, Module } from '../types';
import { ArrowLeft, Save, Image as ImageIcon, Plus, Trash2, Edit2, ChevronDown, ChevronUp, BookOpen, List } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';

const courseSchema = z.object({
  title: z.string().min(1, 'Название курса обязательно'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('Неверный формат URL').optional().or(z.literal('')),
  price: z.number().min(0).default(0),
  trialLessonId: z.string().uuid().optional().or(z.literal('')),
  isVisible: z.boolean().default(true),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CourseForm() {
  const { t } = useTranslation();
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

  const { data: modulesResponse, refetch: refetchModules } = useQuery(
    ['modules', id],
    async () => {
      const response = await api.get<ApiResponse<Module[]>>(`/modules/courses/${id}/modules`);
      return response.data.data || [];
    },
    { enabled: isEdit && !!id }
  );

  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleOrder, setModuleOrder] = useState<number | ''>(0);
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'lessons'>('info');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    moduleId: string | null;
  }>({ isOpen: false, moduleId: null });

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

  const createModuleMutation = useMutation(
    async (data: { title: string; description?: string; order: number }) => {
      const response = await api.post<ApiResponse<Module>>(`/modules/courses/${id}/modules`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        refetchModules();
        setModuleTitle('');
        setModuleDescription('');
        setModuleOrder(0);
        setEditingModule(null);
        setShowModuleForm(false);
      },
    }
  );

  const updateModuleMutation = useMutation(
    async (data: { title: string; description?: string; order: number }) => {
      const response = await api.put<ApiResponse<Module>>(`/modules/${editingModule?.id}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        refetchModules();
        setModuleTitle('');
        setModuleDescription('');
        setModuleOrder(0);
        setEditingModule(null);
        setShowModuleForm(false);
      },
    }
  );

  const deleteModuleMutation = useMutation(
    async (moduleId: string) => {
      await api.delete(`/modules/${moduleId}`);
    },
    {
      onSuccess: () => {
        refetchModules();
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      thumbnailUrl: '',
      price: 0,
      trialLessonId: '',
      isVisible: true,
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
        isVisible: courseResponse.isVisible !== undefined ? courseResponse.isVisible : true,
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
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка курса...</p>
      </div>
    );
  }

  const lessons = courseResponse?.lessons || [];
  const modules = modulesResponse || [];

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setThumbnailPreview(url);
  };

  const handleSaveModule = () => {
    if (!moduleTitle.trim()) {
      setErrorModal({
        isOpen: true,
        message: 'Введите название модуля',
      });
      return;
    }

    if (editingModule) {
      updateModuleMutation.mutate({
        title: moduleTitle,
        description: moduleDescription || undefined,
        order: typeof moduleOrder === 'number' ? moduleOrder : 0,
      });
    } else {
      createModuleMutation.mutate({
        title: moduleTitle,
        description: moduleDescription || undefined,
        order: typeof moduleOrder === 'number' ? moduleOrder : 0,
      });
    }
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

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleTitle(module.title);
    setModuleDescription(module.description || '');
    setModuleOrder(module.order);
    setShowModuleForm(true);
    setActiveTab('modules');
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleDescription('');
    setModuleOrder(0);
    setShowModuleForm(false);
  };

  const handleDeleteModule = (moduleId: string) => {
    setConfirmModal({
      isOpen: true,
      moduleId,
    });
  };

  return (
    <div>
      <button
        onClick={() => navigate('/teacher/courses')}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        {t('common.back')} {t('courses.title')}
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {isEdit ? 'Редактировать курс' : 'Создать курс'}
        </h1>
      </div>

      {isEdit ? (
        // Tabs interface for editing
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'info'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Save className="h-4 w-4 inline mr-2" />
                {t('courses.basicInfo', { defaultValue: 'Основная информация' })}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'modules'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                {t('modules.title')} ({modules.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'lessons'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <List className="h-4 w-4 inline mr-2" />
                Все уроки ({lessons.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="card p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('courses.courseTitle')}
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="input-field"
                  placeholder={t('courses.courseTitle')}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('courses.courseDescription')}
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field"
                  placeholder={t('courses.courseDescription')}
                />
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-neutral-700 mb-2">
                  URL обложки курса
                </label>
                <div className="space-y-3">
                  <input
                    {...register('thumbnailUrl')}
                    type="url"
                    onChange={(e) => {
                      handleThumbnailChange(e);
                      register('thumbnailUrl').onChange(e);
                    }}
                    className="input-field"
                    placeholder="https://..."
                  />
                  {(thumbnailPreview || courseResponse?.thumbnailUrl) && (
                    <div className="relative rounded-lg overflow-hidden border border-neutral-200 shadow-soft animate-fade-scale">
                      <img
                        src={thumbnailPreview || courseResponse?.thumbnailUrl}
                        alt="Course thumbnail"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <ImageIcon className="h-4 w-4" />
                          <span>{t('courses.preview', { defaultValue: 'Предпросмотр' })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {errors.thumbnailUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.thumbnailUrl.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('courses.coursePrice')}
                </label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.45s' }}>
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex-1">
                    <label htmlFor="isVisible" className="block text-sm font-medium text-neutral-700 mb-1">
                      Видимость курса
                    </label>
                    <p className="text-xs text-neutral-500">
                      {watch('isVisible') 
                        ? 'Курс виден всем студентам в каталоге'
                        : 'Курс скрыт из каталога и будет виден только назначенным студентам'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...register('isVisible')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {isEdit && lessons.length > 0 && (
                <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                  <label htmlFor="trialLessonId" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('courses.trialLesson', { defaultValue: 'Пробный урок' })} <span className="text-neutral-500 text-xs">({t('common.optional', { defaultValue: 'необязательно' })})</span>
                  </label>
                  <select
                    {...register('trialLessonId')}
                    className="input-field"
                  >
                    <option value="">{t('courses.notSelected', { defaultValue: 'Не выбран' })}</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={createCourseMutation.isLoading || updateCourseMutation.isLoading}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {createCourseMutation.isLoading || updateCourseMutation.isLoading
                      ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> <span>{t('common.loading')}</span></span>
                      : <span>{t('common.save')}</span>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">{t('modules.courseModules', { defaultValue: 'Модули курса' })}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModuleForm(!showModuleForm);
                    if (showModuleForm) {
                      handleCancelEdit();
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showModuleForm ? 'Отмена' : 'Создать модуль'}
                </button>
              </div>
              
              {/* Module Form */}
              {showModuleForm && (
                <div className="mb-6 p-4 border border-primary-200 rounded-lg bg-primary-50">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">
                    {editingModule ? t('modules.editModule') : t('modules.newModule', { defaultValue: 'Новый модуль' })}
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      placeholder={t('modules.moduleTitle')}
                      className="input-field"
                    />
                    <textarea
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      placeholder={t('modules.moduleDescriptionOptional', { defaultValue: 'Описание модуля (необязательно)' })}
                      rows={2}
                      className="input-field"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-neutral-700">{t('modules.order', { defaultValue: 'Порядок' })}:</label>
                      <input
                        type="number"
                        value={moduleOrder}
                        onChange={(e) => {
                          const value = e.target.value;
                          setModuleOrder(value === '' ? '' : Number(value));
                        }}
                        min="0"
                        className="input-field w-20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveModule}
                        disabled={createModuleMutation.isLoading || updateModuleMutation.isLoading}
                        className="btn-primary text-sm flex-1 disabled:opacity-50"
                      >
                        {createModuleMutation.isLoading || updateModuleMutation.isLoading
                          ? t('common.loading')
                          : editingModule
                          ? t('common.save')
                          : t('common.create')}
                      </button>
                      {editingModule && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn-secondary text-sm"
                        >
                          {t('common.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modules List */}
              {modules.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500 text-sm">{t('modules.noModules')}</p>
                  <p className="text-neutral-400 text-xs mt-2">{t('modules.createFirstModule', { defaultValue: 'Создайте первый модуль для организации уроков' })}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules
                    .sort((a, b) => a.order - b.order)
                    .map((module) => {
                      const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
                      const isExpanded = expandedModules.has(module.id);
                      return (
                        <div
                          key={module.id}
                          className="border border-neutral-200 rounded-lg overflow-hidden hover:border-primary-300 transition-all"
                        >
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer bg-neutral-50 hover:bg-neutral-100"
                            onClick={() => toggleModule(module.id)}
                          >
                            <div className="flex-1 flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-neutral-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-neutral-400" />
                              )}
                              <div className="flex-1">
                                <span className="text-sm font-semibold text-neutral-900">
                                  {module.title}
                                </span>
                                {module.description && (
                                  <p className="text-xs text-neutral-500 mt-1">
                                    {module.description}
                                  </p>
                                )}
                                <p className="text-xs text-neutral-400 mt-1">
                                  Порядок: {module.order} • Уроков: {moduleLessons.length}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Link
                                to={`/teacher/courses/${id}/lessons/new?moduleId=${module.id}`}
                                className="text-primary-600 hover:text-primary-700 text-sm transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50"
                                title={t('lessons.addToModule', { defaultValue: 'Добавить урок в модуль' })}
                              >
                                <Plus className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleEditModule(module)}
                                className="text-primary-600 hover:text-primary-700 text-sm transition-colors px-2 py-1 rounded hover:bg-primary-50"
                                title={t('modules.editModule')}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteModule(module.id)}
                                className="text-red-500 hover:text-red-600 text-sm transition-colors px-2 py-1 rounded hover:bg-red-50"
                                title={t('modules.deleteModule', { defaultValue: 'Удалить модуль' })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {/* Lessons in this module - Collapsible */}
                          {isExpanded && (
                            <div className="border-t border-neutral-200 bg-white">
                              {moduleLessons.length > 0 ? (
                                <div className="p-3 space-y-2">
                                  {moduleLessons
                                    .sort((a, b) => a.order - b.order)
                                    .map((lesson, index) => (
                                      <div
                                        key={lesson.id}
                                        className="flex items-center justify-between p-2 bg-neutral-50 rounded hover:bg-neutral-100 transition-colors"
                                      >
                                        <span className="text-xs text-neutral-700">
                                          {index + 1}. {lesson.title}
                                        </span>
                                        <Link
                                          to={`/teacher/courses/${id}/lessons/${lesson.id}/edit`}
                                          className="text-primary-600 hover:text-primary-700 text-xs transition-colors"
                                        >
                                          {t('common.edit')}
                                        </Link>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="p-3 text-center">
                                  <p className="text-xs text-neutral-400">{t('modules.noLessonsInModule', { defaultValue: 'Нет уроков в этом модуле' })}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lessons' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">{t('courses.allLessons', { defaultValue: 'Все уроки курса' })}</h2>
                <Link
                  to={`/teacher/courses/${id}/lessons/new`}
                  className="btn-primary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('lessons.createLesson')}
                </Link>
              </div>
              
              {lessons.length === 0 ? (
                <div className="text-center py-12">
                  <List className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500 text-sm">{t('lessons.noLessons')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, index) => {
                      const lessonModule = modules.find(m => m.id === lesson.moduleId);
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-neutral-50 transition-all"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium text-neutral-900">
                              {index + 1}. {lesson.title}
                            </span>
                            {lessonModule && (
                              <p className="text-xs text-neutral-400 mt-1">
                                {t('modules.title')}: {lessonModule.title}
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/teacher/courses/${id}/lessons/${lesson.id}/edit`}
                            className="text-primary-600 hover:text-primary-700 text-sm transition-colors"
                          >
                            Редактировать
                          </Link>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Simple form for creating new course
        <div className="card p-6 animate-fade-scale">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                Название курса
              </label>
              <input
                {...register('title')}
                type="text"
                className="input-field"
                placeholder="Введите название курса"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
              <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                Описание курса
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="input-field"
                placeholder="Введите описание курса"
              />
            </div>

            <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
              <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-neutral-700 mb-2">
                URL обложки курса
              </label>
              <div className="space-y-3">
                <input
                  {...register('thumbnailUrl')}
                  type="url"
                  onChange={(e) => {
                    handleThumbnailChange(e);
                    register('thumbnailUrl').onChange(e);
                  }}
                  className="input-field"
                  placeholder="https://..."
                />
                {thumbnailPreview && (
                  <div className="relative rounded-lg overflow-hidden border border-neutral-200 shadow-soft animate-fade-scale">
                    <img
                      src={thumbnailPreview}
                      alt="Course thumbnail"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <ImageIcon className="h-4 w-4" />
                        <span>Предпросмотр</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {errors.thumbnailUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.thumbnailUrl.message}</p>
              )}
            </div>

            <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
              <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-2">
                Цена курса
              </label>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                placeholder="0"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>

            <div className="animate-slide-in" style={{ animationDelay: '0.45s' }}>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex-1">
                  <label htmlFor="isVisible" className="block text-sm font-medium text-neutral-700 mb-1">
                    Видимость курса
                  </label>
                  <p className="text-xs text-neutral-500">
                    {watch('isVisible') 
                      ? 'Курс виден всем студентам в каталоге'
                      : 'Курс скрыт из каталога и будет виден только назначенным студентам'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    {...register('isVisible')}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
              <button
                type="submit"
                disabled={createCourseMutation.isLoading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5 mr-2" />
                {createCourseMutation.isLoading
                  ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> <span>Создание...</span></span>
                  : <span>Создать курс</span>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />

      {/* Confirm Delete Module Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, moduleId: null })}
        onConfirm={() => {
          if (confirmModal.moduleId) {
            deleteModuleMutation.mutate(confirmModal.moduleId);
            setConfirmModal({ isOpen: false, moduleId: null });
          }
        }}
        title={t('modules.deleteModule', { defaultValue: 'Удалить модуль' })}
        message={t('modules.deleteConfirm', { defaultValue: 'Вы уверены, что хотите удалить этот модуль? Все уроки в модуле останутся, но будут без модуля.' })}
        variant="danger"
      />
    </div>
  );
}
