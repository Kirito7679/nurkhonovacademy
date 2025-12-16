import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Lesson, LessonFile, Quiz as QuizType, QuizQuestion, Module, PracticeExercise, ExternalIntegration, DragDropExercise, MatchingExercise, ApiError } from '../types';
import { ArrowLeft, Save, Upload, X, Plus, Trash2, FileQuestion, Puzzle, BookOpen, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import DragAndDrop from '../components/exercises/DragAndDrop';
import Matching from '../components/exercises/Matching';
import GoogleDocsEmbed from '../components/integrations/GoogleDocsEmbed';
import QuizletImport from '../components/integrations/QuizletImport';
import InputModal from '../components/InputModal';
import ErrorModal from '../components/ErrorModal';
import SuccessModal from '../components/SuccessModal';
import ConfirmModal from '../components/ConfirmModal';
import ExerciseEditModal from '../components/ExerciseEditModal';
import FileUploadProgress from '../components/FileUploadProgress';

const lessonSchema = z.object({
  courseId: z.string().uuid('Неверный ID курса'),
  moduleId: z.string().uuid('Неверный ID модуля').optional().or(z.literal('')),
  title: z.string().min(1, 'Название урока обязательно'),
  description: z.string().optional(),
  order: z.number().int().min(0).default(0),
  videoUrl: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true; // Empty is valid
      // Allow URLs (http/https) or file paths from uploads
      if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/api/files/')) {
        return true;
      }
      // Allow Supabase and Cloudinary URLs
      if (val.includes('supabase.co') || val.includes('cloudinary.com')) {
        return true;
      }
      return false;
    }, { message: 'Введите валидный URL или загрузите видео файл' }),
});

type LessonFormData = z.infer<typeof lessonSchema>;

export default function LessonForm() {
  const { t } = useTranslation();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!lessonId;
  const moduleIdFromUrl = searchParams.get('moduleId') || '';
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showQuizSection, setShowQuizSection] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<Array<{
    question: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'DRAG_DROP' | 'MATCHING' | 'FILL_BLANK';
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswer?: string;
    metadata?: string; // JSON string for complex question data
  }>>([]);
  const [showExercisesSection, setShowExercisesSection] = useState(false);
  const [showIntegrationsSection, setShowIntegrationsSection] = useState(false);
  const [exercises, setExercises] = useState<PracticeExercise[]>([]);
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([]);
  const hasResetRef = useRef(false);
  
  // Input modal state
  const [inputModal, setInputModal] = useState<{
    isOpen: boolean;
    title: string;
    label: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
    defaultValue?: string;
    required?: boolean;
  }>({
    isOpen: false,
    title: '',
    label: '',
    onConfirm: () => {},
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Exercise edit modal state
  const [editExerciseModal, setEditExerciseModal] = useState<{
    isOpen: boolean;
    exercise: PracticeExercise | null;
  }>({
    isOpen: false,
    exercise: null,
  });

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

  const { data: quizResponse } = useQuery(
    ['quiz', lessonId],
    async () => {
      try {
        const response = await api.get<ApiResponse<QuizType>>(`/quizzes/lesson/${lessonId}`);
        return response.data.data;
      } catch {
        return null;
      }
    },
    { enabled: isEdit && !!lessonId }
  );

  const { data: modulesResponse } = useQuery(
    ['modules', courseId],
    async () => {
      const response = await api.get<ApiResponse<Module[]>>(`/modules/courses/${courseId}/modules`);
      return response.data.data || [];
    },
    { enabled: !!courseId }
  );

  // Get exercises for the lesson
  const { data: exercisesResponse } = useQuery(
    ['lessonExercises', lessonId],
    async () => {
      try {
        const response = await api.get<ApiResponse<PracticeExercise[]>>(`/practice/lessons/${lessonId}`);
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    { enabled: isEdit && !!lessonId }
  );

  // Get integrations for the lesson
  const { data: integrationsResponse } = useQuery(
    ['lessonIntegrations', lessonId],
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
    { enabled: isEdit && !!lessonId }
  );

  useEffect(() => {
    if (exercisesResponse) {
      setExercises(exercisesResponse);
    }
  }, [exercisesResponse]);

  useEffect(() => {
    if (integrationsResponse) {
      setIntegrations(integrationsResponse);
    }
  }, [integrationsResponse]);

  const saveQuizMutation = useMutation(
    async () => {
      const formattedQuestions = questions.map(q => ({
        question: q.question,
        type: q.type,
        order: 0,
        metadata: q.metadata || null,
        options: q.options,
        correctAnswer: q.correctAnswer || (q.metadata ? JSON.stringify(JSON.parse(q.metadata).correctMapping || {}) : null),
      }));

      const response = await api.post<ApiResponse<QuizType>>(
        `/quizzes/lesson/${lessonId}`,
        {
          title: quizTitle || null,
          description: quizDescription || null,
          passingScore,
          questions: formattedQuestions,
        }
      );
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['quiz', lessonId]);
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: t('quiz.saveSuccess', { defaultValue: 'Тест успешно сохранен!' }),
        });
      },
      onError: (error: ApiError) => {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: error.response?.data?.message || 'Ошибка при сохранении теста',
        });
      },
    }
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

  // Exercise mutations
  const createExerciseMutation = useMutation(
    async (data: { title: string; description?: string; type: string; metadata: string }) => {
      // Convert metadata to instructions for backend
      const response = await api.post<ApiResponse<PracticeExercise>>(`/practice/lessons/${lessonId}`, {
        title: data.title,
        description: data.description,
        type: data.type,
        instructions: data.metadata, // Store metadata as instructions
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonExercises', lessonId]);
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: t('practice.createSuccess', { defaultValue: 'Упражнение успешно создано!' }),
        });
      },
      onError: (error: ApiError) => {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: error.response?.data?.message || t('practice.createError', { defaultValue: 'Ошибка при создании упражнения' }),
        });
      },
    }
  );

  const updateExerciseMutation = useMutation(
    async (data: { exerciseId: string; title: string; instructions: string }) => {
      const response = await api.put<ApiResponse<PracticeExercise>>(`/practice/exercises/${data.exerciseId}`, {
        title: data.title,
        instructions: data.instructions,
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonExercises', lessonId]);
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: t('practice.updateSuccess', { defaultValue: 'Упражнение успешно обновлено!' }),
        });
        setEditExerciseModal({ isOpen: false, exercise: null });
      },
      onError: (error: ApiError) => {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: error.response?.data?.message || t('practice.updateError', { defaultValue: 'Ошибка при обновлении упражнения' }),
        });
      },
    }
  );

  const deleteExerciseMutation = useMutation(
    async (exerciseId: string) => {
      await api.delete(`/practice/exercises/${exerciseId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonExercises', lessonId]);
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: t('practice.deleteSuccess', { defaultValue: 'Упражнение успешно удалено' }),
        });
      },
      onError: (error: ApiError) => {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: error.response?.data?.message || t('practice.deleteError', { defaultValue: 'Ошибка при удалении упражнения' }),
        });
      },
    }
  );

  // Integration mutations
  const createIntegrationMutation = useMutation(
    async (data: { type: string; externalUrl: string; metadata?: string }) => {
      const response = await api.post<ApiResponse<ExternalIntegration>>(`/lessons/${lessonId}/integrations`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonIntegrations', lessonId]);
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: t('integrations.addSuccess', { defaultValue: 'Интеграция успешно добавлена!' }),
        });
      },
      onError: (error: ApiError) => {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: error.response?.data?.message || 'Ошибка при добавлении интеграции',
        });
      },
    }
  );

  const deleteIntegrationMutation = useMutation(
    async (integrationId: string) => {
      await api.delete(`/integrations/${integrationId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['lessonIntegrations', lessonId]);
      },
    }
  );

  const handleCreateDragDropExercise = () => {
    setInputModal({
      isOpen: true,
      title: t('practice.createDragDrop', { defaultValue: 'Создать упражнение Drag & Drop' }),
      label: t('practice.enterExerciseTitle', { defaultValue: 'Введите название упражнения:' }),
      placeholder: t('practice.exerciseTitlePlaceholder', { defaultValue: 'Название упражнения' }),
      required: true,
      onConfirm: (title) => {
        if (!title) return;

        const items: DragDropExercise = {
          type: 'DRAG_DROP',
          items: [
            { id: '1', content: 'Пример 1' },
            { id: '2', content: 'Пример 2' },
          ],
          dropZones: [
            { id: 'zone1', label: 'Зона 1', correctItemId: '1' },
            { id: 'zone2', label: 'Зона 2', correctItemId: '2' },
          ],
        };

        createExerciseMutation.mutate({
          title,
          type: 'DRAG_DROP',
          metadata: JSON.stringify(items),
        });
      },
    });
  };

  const handleCreateMatchingExercise = () => {
    setInputModal({
      isOpen: true,
      title: t('practice.createMatching', { defaultValue: 'Создать упражнение Matching' }),
      label: t('practice.enterExerciseTitle', { defaultValue: 'Введите название упражнения:' }),
      placeholder: t('practice.exerciseTitlePlaceholder', { defaultValue: 'Название упражнения' }),
      required: true,
      onConfirm: (title) => {
        if (!title) return;

        const items: MatchingExercise = {
          type: 'MATCHING',
          items: [
            { id: '1', left: 'Пример 1', right: 'Example 1' },
            { id: '2', left: 'Пример 2', right: 'Example 2' },
          ],
        };

        createExerciseMutation.mutate({
          title,
          type: 'MATCHING',
          metadata: JSON.stringify(items),
        });
      },
    });
  };

  const handleCreateGoogleDocsIntegration = () => {
    setInputModal({
      isOpen: true,
      title: t('integrations.addGoogleDocs', { defaultValue: 'Добавить Google Docs' }),
      label: 'Введите URL документа Google Docs:',
      placeholder: 'https://docs.google.com/...',
      required: true,
      onConfirm: (url) => {
        if (!url) return;

        // Show second modal for optional title after a short delay
        setTimeout(() => {
          setInputModal({
            isOpen: true,
            title: t('integrations.addGoogleDocs', { defaultValue: 'Добавить Google Docs' }),
            label: t('integrations.enterDocumentTitle', { defaultValue: 'Введите название документа (необязательно):' }),
            placeholder: t('integrations.documentTitlePlaceholder', { defaultValue: 'Название документа' }),
            required: false,
            onConfirm: (title) => {
              createIntegrationMutation.mutate({
                type: 'GOOGLE_DOCS',
                externalUrl: url,
                metadata: title ? JSON.stringify({ title }) : undefined,
              });
            },
          });
        }, 100);
      },
    });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      courseId: courseId || '',
      moduleId: moduleIdFromUrl || '',
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
        moduleId: lessonResponse.moduleId || '',
        title: lessonResponse.title,
        description: lessonResponse.description || '',
        order: lessonResponse.order,
        videoUrl: lessonResponse.videoUrl || '',
      });
      hasResetRef.current = true;
    } else if (courseId && !isEdit && !hasResetRef.current) {
      reset({
        courseId: courseId,
        moduleId: moduleIdFromUrl || '',
        title: '',
        description: '',
        order: 0,
        videoUrl: '',
      });
      hasResetRef.current = true;
    }
    
    // Set moduleId from URL if provided and form is ready
    if (moduleIdFromUrl && !isEdit && hasResetRef.current) {
      setValue('moduleId', moduleIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonResponse, courseId, isEdit, moduleIdFromUrl]);

  useEffect(() => {
    if (quizResponse) {
      setQuizTitle(quizResponse.title || '');
      setQuizDescription(quizResponse.description || '');
      setPassingScore(quizResponse.passingScore);
      setQuestions(
        quizResponse.questions.map((q) => ({
          question: q.question,
          type: q.type as any,
          options: q.options?.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          })),
          correctAnswer: q.correctAnswer || undefined,
          metadata: q.metadata || undefined,
        }))
      );
      setShowQuizSection(true);
    }
  }, [quizResponse]);

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
    setFileUploadProgress({ fileName: file.name, progress: 0 });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lessonId', lessonId);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFileUploadProgress({ fileName: file.name, progress });
          }
        },
      });
      queryClient.invalidateQueries(['lessonFiles', lessonId]);
      setFileUploadProgress(null);
    } catch (error: ApiError) {
      setErrorModal({
        isOpen: true,
        title: t('common.error', { defaultValue: 'Ошибка' }),
        message: error.response?.data?.message || 'Ошибка при загрузке файла',
      });
      setFileUploadProgress(null);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a video file
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/mpeg'];
    if (!videoTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|ogg|mov|avi|wmv|flv|mpeg|mpg)$/i)) {
      setErrorModal({
        isOpen: true,
        title: t('common.error', { defaultValue: 'Ошибка' }),
        message: 'Пожалуйста, выберите видео файл (MP4, WebM, MOV, AVI и т.д.)',
      });
      e.target.value = '';
      return;
    }

    // Check file size (max 500MB for videos)
    if (file.size > 500 * 1024 * 1024) {
      setErrorModal({
        isOpen: true,
        title: t('common.error', { defaultValue: 'Ошибка' }),
        message: 'Размер видео файла не должен превышать 500 MB',
      });
      e.target.value = '';
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress({ fileName: file.name, progress: 0 });
    const formData = new FormData();
    formData.append('file', file);
    
    // If lesson exists, upload as lesson file and use its URL
    if (lessonId) {
      formData.append('lessonId', lessonId);
    }

    try {
      const response = await api.post<ApiResponse<{ fileUrl: string; fileName: string }>>('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setVideoUploadProgress({ fileName: file.name, progress });
          }
        },
      });
      
      // Set video URL in the form
      if (response.data.data?.fileUrl) {
        setValue('videoUrl', response.data.data.fileUrl);
        if (lessonId) {
          queryClient.invalidateQueries(['lessonFiles', lessonId]);
        }
        setSuccessModal({
          isOpen: true,
          title: t('common.success', { defaultValue: 'Успешно' }),
          message: 'Видео успешно загружено! Не забудьте сохранить урок.',
        });
      }
      setVideoUploadProgress(null);
    } catch (error: ApiError) {
      setErrorModal({
        isOpen: true,
        title: t('common.error', { defaultValue: 'Ошибка' }),
        message: error.response?.data?.message || 'Ошибка при загрузке видео',
      });
      setVideoUploadProgress(null);
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('files.deleteFile', { defaultValue: 'Удалить файл' }),
      message: t('files.deleteConfirm', { defaultValue: 'Вы уверены, что хотите удалить этот файл?' }),
      variant: 'danger',
      onConfirm: () => {
        deleteFileMutation.mutate(fileId);
      },
    });
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        metadata: undefined,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: string | boolean | Array<{ text: string; isCorrect: boolean }>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'type') {
      if (value === 'TRUE_FALSE') {
        updated[index].options = undefined;
        updated[index].metadata = undefined;
      } else if (value === 'MULTIPLE_CHOICE' && !updated[index].options) {
        updated[index].options = [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ];
        updated[index].metadata = undefined;
      } else if (value === 'DRAG_DROP' || value === 'MATCHING' || value === 'FILL_BLANK') {
        updated[index].options = undefined;
        // Initialize metadata for interactive types
        if (!updated[index].metadata) {
          if (value === 'DRAG_DROP') {
            updated[index].metadata = JSON.stringify({
              items: [],
              targets: [],
              correctMapping: {},
            });
          } else if (value === 'MATCHING') {
            updated[index].metadata = JSON.stringify({
              leftItems: [],
              rightItems: [],
              correctPairs: [],
            });
          } else if (value === 'FILL_BLANK') {
            updated[index].metadata = JSON.stringify({
              text: '',
              blanks: [],
            });
          }
        }
      }
    }
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push({ text: '', isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter(
        (_, i) => i !== optionIndex
      );
    }
    setQuestions(updated);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    field: string,
    value: any
  ) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = {
        ...updated[questionIndex].options![optionIndex],
        [field]: value,
      };
    }
    setQuestions(updated);
  };

  const handleSaveQuiz = () => {
    if (!lessonId) {
      setErrorModal({
        isOpen: true,
        title: t('common.error', { defaultValue: 'Ошибка' }),
        message: t('lessons.saveLessonFirst', { defaultValue: 'Сначала сохраните урок' }),
      });
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorModal({
          isOpen: true,
          title: t('common.error', { defaultValue: 'Ошибка' }),
          message: t('quiz.enterQuestionText', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: введите текст вопроса` }),
        });
        return;
      }

      if (q.type === 'MULTIPLE_CHOICE') {
        if (!q.options || q.options.length < 2) {
          setErrorModal({
            isOpen: true,
            title: t('common.error', { defaultValue: 'Ошибка' }),
            message: t('quiz.addMinOptions', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: добавьте минимум 2 варианта ответа` }),
          });
          return;
        }
        const hasCorrect = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          setErrorModal({
            isOpen: true,
            title: t('common.error', { defaultValue: 'Ошибка' }),
            message: t('quiz.selectCorrectAnswer', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: выберите правильный ответ` }),
          });
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            setErrorModal({
              isOpen: true,
              title: t('common.error', { defaultValue: 'Ошибка' }),
              message: `Вопрос ${i + 1}, вариант ${j + 1}: введите текст варианта`,
            });
            return;
          }
        }
      } else if (q.type === 'TRUE_FALSE') {
        if (!q.correctAnswer) {
          setErrorModal({
            isOpen: true,
            title: t('common.error', { defaultValue: 'Ошибка' }),
            message: t('quiz.selectTrueFalse', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: выберите правильный ответ (Верно/Неверно)` }),
          });
          return;
        }
      } else if (q.type === 'DRAG_DROP' || q.type === 'MATCHING' || q.type === 'FILL_BLANK') {
        if (!q.metadata || !q.metadata.trim()) {
          setErrorModal({
            isOpen: true,
            title: t('common.error', { defaultValue: 'Ошибка' }),
            message: t('quiz.fillMetadata', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: заполните метаданные для интерактивного задания` }),
          });
          return;
        }
        try {
          JSON.parse(q.metadata);
        } catch {
          setErrorModal({
            isOpen: true,
            title: t('common.error', { defaultValue: 'Ошибка' }),
            message: t('quiz.metadataMustBeJson', { questionNum: i + 1, defaultValue: `Вопрос ${i + 1}: метаданные должны быть в формате JSON` }),
          });
          return;
        }
      }
    }

    saveQuizMutation.mutate();
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

  const files = filesResponse || [];

  return (
    <div>
      <button
        onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        {t('common.back')} {t('courses.title')}
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {isEdit ? t('lessons.editLesson') : t('lessons.createLesson')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6 animate-fade-scale">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('lessons.lessonTitle')}
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="input-field"
                  placeholder={t('lessons.lessonTitle')}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <label htmlFor="moduleId" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('modules.title')} <span className="text-neutral-500 text-xs">({t('common.optional')})</span>
                </label>
                <select
                  {...register('moduleId')}
                  className="input-field"
                >
                  <option value="">{t('courses.notSelected')}</option>
                  {(modulesResponse || []).map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('lessons.lessonDescription')}
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field"
                  placeholder={t('lessons.lessonDescription')}
                />
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <label htmlFor="order" className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('lessons.order')}
                </label>
                <input
                  {...register('order', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="input-field"
                />
                {errors.order && (
                  <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                <label htmlFor="videoUrl" className="block text-sm font-medium text-neutral-700 mb-2">
                  Видео урока
                </label>
                
                {/* Video Upload Progress */}
                {videoUploadProgress && (
                  <FileUploadProgress
                    fileName={videoUploadProgress.fileName}
                    progress={videoUploadProgress.progress}
                    onCancel={() => {
                      setUploadingVideo(false);
                      setVideoUploadProgress(null);
                      if (videoInputRef.current) videoInputRef.current.value = '';
                    }}
                  />
                )}

                {/* Video Upload Button */}
                <div className="mb-3">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/x-flv,video/mpeg,.mp4,.webm,.ogg,.mov,.avi,.wmv,.flv,.mpeg,.mpg"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="w-full px-4 py-2 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-500 cursor-pointer transition-all hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="h-5 w-5 text-primary-500" />
                    {uploadingVideo ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        <span>Загрузка видео...</span>
                      </span>
                    ) : (
                      <span>Загрузить видео с компьютера (MP4, WebM, MOV, AVI и т.д.)</span>
                    )}
                  </button>
                  <p className="mt-1 text-xs text-neutral-500">
                    Максимальный размер: 500 MB. Поддерживаются: MP4, WebM, MOV, AVI, WMV, FLV, MPEG
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-t border-neutral-300"></div>
                  <span className="text-xs text-neutral-500">или</span>
                  <div className="flex-1 border-t border-neutral-300"></div>
                </div>

                {/* URL Input */}
                <div>
                  <label htmlFor="videoUrl" className="block text-sm font-medium text-neutral-700 mb-2">
                    Или введите URL видео
                  </label>
                  <input
                    {...register('videoUrl')}
                    type="url"
                    placeholder="YouTube, Vimeo, Google Drive, VK или прямая ссылка на видео"
                    className="input-field"
                  />
                  {errors.videoUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.videoUrl.message}</p>
                  )}
                  <p className="mt-1 text-sm text-neutral-500">
                    Поддерживаются: YouTube, Vimeo, Google Drive, VK и прямые ссылки на видео (mp4, webm и т.д.)
                  </p>
                  <div className="mt-2 text-xs text-neutral-400 space-y-1">
                    <p>Примеры:</p>
                    <p>• YouTube: https://www.youtube.com/watch?v=...</p>
                    <p>• Vimeo: https://vimeo.com/123456789</p>
                    <p>• Google Drive: https://drive.google.com/file/d/FILE_ID/view</p>
                    <p>• VK: https://vk.com/video-123456789_123456789</p>
                    <p>• Прямая ссылка: https://example.com/video.mp4</p>
                  </div>
                </div>
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                <button
                  type="submit"
                  disabled={createLessonMutation.isLoading || updateLessonMutation.isLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {createLessonMutation.isLoading || updateLessonMutation.isLoading
                    ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> <span>Сохранение...</span></span>
                    : <span>Сохранить</span>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {isEdit && (
          <div className="space-y-6 animate-fade-scale" style={{ animationDelay: '0.6s' }}>
            {/* Quiz Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-primary-500" />
                  {t('quiz.lessonQuiz', { defaultValue: 'Тест к уроку' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowQuizSection(!showQuizSection)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showQuizSection ? t('common.hide') : t('common.show')}
                </button>
              </div>

              {showQuizSection && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t('quiz.quizTitle')} ({t('common.optional')})
                    </label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder={t('quiz.quizTitleExample', { defaultValue: 'Например: Проверочный тест' })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t('quiz.quizDescription')} ({t('common.optional')})
                    </label>
                    <textarea
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      rows={2}
                      placeholder={t('quiz.quizDescription')}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t('quiz.passingScore')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-900">{t('quiz.questions')}</h3>
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="btn-secondary text-sm inline-flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('quiz.addQuestion')}
                      </button>
                    </div>

                    {questions.length === 0 ? (
                      <p className="text-sm text-neutral-500 text-center py-4">
                        {t('quiz.noQuestions', { defaultValue: 'Нет вопросов. Добавьте первый вопрос.' })}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((question, qIndex) => (
                          <div key={qIndex} className="border border-neutral-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-sm font-medium text-neutral-700">
                                {t('quiz.question')} {qIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeQuestion(qIndex)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="mb-3">
                              <input
                                type="text"
                                value={question.question}
                                onChange={(e) =>
                                  updateQuestion(qIndex, 'question', e.target.value)
                                }
                                placeholder="Введите вопрос..."
                                className="input-field"
                              />
                            </div>

                            <div className="mb-3">
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                {t('quiz.questionType', { defaultValue: 'Тип вопроса' })}
                              </label>
                              <select
                                value={question.type}
                                onChange={(e) =>
                                  updateQuestion(
                                    qIndex,
                                    'type',
                                    e.target.value as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'DRAG_DROP' | 'MATCHING' | 'FILL_BLANK'
                                  )
                                }
                                className="input-field"
                              >
                                <option value="MULTIPLE_CHOICE">{t('quiz.multipleChoice')}</option>
                                <option value="TRUE_FALSE">{t('quiz.trueFalse')}</option>
                                <option value="DRAG_DROP">{t('quiz.dragDrop')}</option>
                                <option value="MATCHING">{t('quiz.matching')}</option>
                                <option value="FILL_BLANK">{t('quiz.fillBlank')}</option>
                              </select>
                            </div>

                            {question.type === 'MULTIPLE_CHOICE' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-neutral-700">
                                    Варианты ответов
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => addOption(qIndex)}
                                    className="text-xs text-primary-600 hover:text-primary-700"
                                  >
                                    + {t('quiz.addOption')}
                                  </button>
                                </div>
                                {question.options?.map((option, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) =>
                                        updateOption(qIndex, oIndex, 'text', e.target.value)
                                      }
                                      placeholder={`Вариант ${oIndex + 1}`}
                                      className="input-field flex-1"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={option.isCorrect}
                                        onChange={(e) =>
                                          updateOption(
                                            qIndex,
                                            oIndex,
                                            'isCorrect',
                                            e.target.checked
                                          )
                                        }
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm text-neutral-600">Правильный</span>
                                    </label>
                                    {question.options!.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => removeOption(qIndex, oIndex)}
                                        className="text-red-500 hover:text-red-600"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {question.type === 'TRUE_FALSE' && (
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                  Правильный ответ
                                </label>
                                <select
                                  value={question.correctAnswer || ''}
                                  onChange={(e) =>
                                    updateQuestion(qIndex, 'correctAnswer', e.target.value)
                                  }
                                  className="input-field"
                                >
                                  <option value="">Выберите ответ</option>
                                  <option value="true">Верно</option>
                                  <option value="false">Неверно</option>
                                </select>
                              </div>
                            )}

                            {(question.type === 'DRAG_DROP' || question.type === 'MATCHING' || question.type === 'FILL_BLANK') && (
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>Интерактивные задания</strong> требуют настройки метаданных.
                                </p>
                                <p className="text-xs text-blue-600">
                                  Для создания таких заданий используйте JSON формат в поле метаданных.
                                  Примеры форматов можно найти в документации.
                                </p>
                                <textarea
                                  value={question.metadata || ''}
                                  onChange={(e) => updateQuestion(qIndex, 'metadata', e.target.value)}
                                  placeholder='{"items": [...], "targets": [...], "correctMapping": {...}}'
                                  rows={4}
                                  className="input-field mt-2 font-mono text-xs"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveQuiz}
                      disabled={saveQuizMutation.isLoading || questions.length === 0}
                      className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveQuizMutation.isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>Сохранение...</span>
                        </span>
                      ) : (
                        'Сохранить тест'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Files Section */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                Файлы урока
              </h2>

              {/* File Upload Progress */}
              {fileUploadProgress && (
                <FileUploadProgress
                  fileName={fileUploadProgress.fileName}
                  progress={fileUploadProgress.progress}
                  onCancel={() => {
                    setUploadingFile(false);
                    setFileUploadProgress(null);
                  }}
                />
              )}
              
              <div className="mb-4">
                <label className="block w-full">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile || !lessonId}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.ogg,.mov,.avi,.wmv,.flv,.mpeg"
                    className="hidden"
                  />
                  <span className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-neutral-300 rounded-lg hover:border-primary-400 cursor-pointer transition-all hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload className="h-5 w-5 mr-2 text-primary-500" />
                    {uploadingFile ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        <span>Загрузка...</span>
                      </span>
                    ) : !lessonId ? (
                      <span className="text-neutral-500">Сначала сохраните урок</span>
                    ) : (
                      <span>Загрузить файл (PDF, DOC, видео, изображения и др.)</span>
                    )}
                  </span>
                </label>
                <p className="mt-2 text-xs text-neutral-500">
                  Поддерживаются: документы (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX), изображения (JPG, PNG, GIF, WebP), 
                  видео (MP4, WebM, MOV, AVI и др.), архивы (ZIP). Максимальный размер: 100 MB
                </p>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-neutral-500">Нет файлов</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Загрузите файлы к уроку (PDF, документы, видео и др.)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-neutral-50 transition-all animate-slide-in"
                      style={{ animationDelay: `${0.1 * index}s` }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 mr-3">
                          {file.fileName.match(/\.(pdf|doc|docx)$/i) ? (
                            <FileQuestion className="h-5 w-5 text-blue-500" />
                          ) : file.fileName.match(/\.(mp4|webm|mov|avi)$/i) ? (
                            <BookOpen className="h-5 w-5 text-purple-500" />
                          ) : (
                            <Upload className="h-5 w-5 text-primary-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="ml-2 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Удалить"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exercises Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-primary-500" />
                  Интерактивные упражнения
                </h2>
                <button
                  type="button"
                  onClick={() => setShowExercisesSection(!showExercisesSection)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showExercisesSection ? 'Скрыть' : 'Показать'}
                </button>
              </div>

              {showExercisesSection && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCreateDragDropExercise}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить Drag & Drop
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateMatchingExercise}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить Matching
                    </button>
                  </div>

                  {exercises.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-neutral-500">Нет упражнений</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        Создайте упражнение, нажав на кнопки выше
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="p-4 border border-neutral-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-neutral-900 mb-1">{exercise.title}</h3>
                              {exercise.description && (
                                <p className="text-sm text-neutral-600 mb-1">{exercise.description}</p>
                              )}
                              <p className="text-sm text-neutral-600">
                                Тип: <span className="font-medium">{exercise.type === 'DRAG_DROP' ? 'Drag & Drop' : exercise.type === 'MATCHING' ? 'Matching' : exercise.type}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditExerciseModal({
                                    isOpen: true,
                                    exercise: exercise,
                                  });
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1.5"
                                title="Редактировать упражнение"
                              >
                                <Save className="h-4 w-4" />
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: t('practice.deleteExercise', { defaultValue: 'Удалить упражнение' }),
                                    message: t('practice.deleteConfirm', { defaultValue: 'Удалить это упражнение?' }),
                                    variant: 'danger',
                                    onConfirm: () => {
                                      deleteExerciseMutation.mutate(exercise.id);
                                    },
                                  });
                                }}
                                className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                                title="Удалить упражнение"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Integrations Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary-500" />
                  Интеграции
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIntegrationsSection(!showIntegrationsSection)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showIntegrationsSection ? 'Скрыть' : 'Показать'}
                </button>
              </div>

              {showIntegrationsSection && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCreateGoogleDocsIntegration}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить Google Docs
                    </button>
                  </div>

                  {integrations.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-neutral-500">Нет интеграций</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        Добавьте интеграцию, нажав на кнопку выше
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {integrations.map((integration) => (
                        <div
                          key={integration.id}
                          className="p-4 border border-neutral-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-neutral-900">
                              {integration.type === 'GOOGLE_DOCS' ? 'Google Docs' : integration.type}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: t('integrations.deleteIntegration', { defaultValue: 'Удалить интеграцию' }),
                                  message: t('integrations.deleteConfirm', { defaultValue: 'Удалить эту интеграцию?' }),
                                  variant: 'danger',
                                  onConfirm: () => {
                                    deleteIntegrationMutation.mutate(integration.id);
                                  },
                                });
                              }}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-sm text-neutral-600 break-all">{integration.externalUrl}</p>
                          {integration.type === 'GOOGLE_DOCS' && (
                            <div className="mt-4">
                              <GoogleDocsEmbed
                                docUrl={integration.externalUrl}
                                title={integration.metadata ? JSON.parse(integration.metadata).title : undefined}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quizlet Import Component */}
                  {lessonId && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Импорт из Quizlet</h3>
                      <QuizletImport
                        lessonId={lessonId}
                        onImportComplete={(flashcards) => {
                          setSuccessModal({
                            isOpen: true,
                            title: t('common.success', { defaultValue: 'Успешно' }),
                            message: t('flashcards.imported', { count: flashcards.length, defaultValue: `Импортировано ${flashcards.length} карточек!` }),
                          });
                          queryClient.invalidateQueries(['lessonFlashcardDecks', lessonId]);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Modal for exercise/integration creation */}
      <InputModal
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal({ ...inputModal, isOpen: false })}
        onConfirm={inputModal.onConfirm}
        title={inputModal.title}
        label={inputModal.label}
        placeholder={inputModal.placeholder}
        defaultValue={inputModal.defaultValue}
        required={inputModal.required}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant || 'warning'}
      />

      {/* Exercise Edit Modal */}
      <ExerciseEditModal
        isOpen={editExerciseModal.isOpen}
        onClose={() => setEditExerciseModal({ isOpen: false, exercise: null })}
        onSave={(updatedExercise) => {
          updateExerciseMutation.mutate({
            exerciseId: updatedExercise.id,
            title: updatedExercise.title,
            instructions: updatedExercise.instructions,
          });
        }}
        exercise={editExerciseModal.exercise}
      />
    </div>
  );
}

