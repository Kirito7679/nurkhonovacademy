import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, PracticeExercise, PracticeResult } from '../types';
import { Plus, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function PracticeExercises() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedExercise, setSelectedExercise] = useState<PracticeExercise | null>(null);
  const [answer, setAnswer] = useState('');
  const [showResults, setShowResults] = useState(false);

  const { data: exercisesResponse, isLoading } = useQuery(
    ['practiceExercises', lessonId],
    async () => {
      const response = await api.get<ApiResponse<PracticeExercise[]>>(
        `/practice/lessons/${lessonId}`
      );
      return response.data.data || [];
    },
    { enabled: !!lessonId }
  );

  const { data: resultsResponse } = useQuery(
    ['practiceResults', selectedExercise?.id],
    async () => {
      if (!selectedExercise) return [];
      const response = await api.get<ApiResponse<PracticeResult[]>>(
        `/practice/${selectedExercise.id}/results`
      );
      return response.data.data || [];
    },
    { enabled: !!selectedExercise && user?.role === 'STUDENT' }
  );

  const submitMutation = useMutation(
    async (exerciseId: string) => {
      const response = await api.post<ApiResponse<PracticeResult>>(
        `/practice/${exerciseId}/submit`,
        { answer }
      );
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['practiceResults', selectedExercise?.id]);
        setShowResults(true);
        setAnswer('');
      },
    }
  );

  const exercises = exercisesResponse || [];
  const results = resultsResponse || [];

  const canCreate = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MODERATOR' || user?.role === 'CURATOR';

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка упражнений...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {t('practice.title')}
        </h1>
        {canCreate && lessonId && (
          <Link
            to={`/lessons/${lessonId}/practice/new`}
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Создать упражнение
          </Link>
        )}
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">{t('practice.noExercises')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {exercises.map((exercise) => {
            const userResult = results.find((r) => r.exerciseId === exercise.id);
            const canSubmit = user?.role === 'STUDENT' && (!userResult || userResult.attemptNumber < exercise.maxAttempts);

            return (
              <div key={exercise.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      {exercise.title}
                    </h3>
                    {exercise.description && (
                      <p className="text-neutral-600 mb-4">{exercise.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {exercise.type}
                      </span>
                      {exercise.autoCheck && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Автопроверка
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('practice.attempts')}: {userResult?.attemptNumber || 0}/{exercise.maxAttempts}
                      </span>
                    </div>
                    {userResult && (
                      <div className={`p-3 rounded-lg mb-4 ${
                        userResult.status === 'APPROVED' ? 'bg-green-50 border border-green-200' :
                        userResult.status === 'REJECTED' ? 'bg-red-50 border border-red-200' :
                        'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {userResult.status === 'APPROVED' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          )}
                          <span className="font-medium">
                            {userResult.status === 'APPROVED' ? t('practice.approved') :
                             userResult.status === 'REJECTED' ? t('practice.rejected') :
                             t('practice.pending')}
                          </span>
                          {userResult.score !== null && (
                            <span className="ml-auto">{t('practice.score')}: {userResult.score}%</span>
                          )}
                        </div>
                        {userResult.feedback && (
                          <p className="text-sm">{userResult.feedback}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedExercise?.id === exercise.id ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        {t('practice.instructions')}
                      </label>
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <p className="text-neutral-700 whitespace-pre-line">
                          {exercise.instructions}
                        </p>
                      </div>
                    </div>
                    {canSubmit && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          {t('practice.yourAnswer')}
                        </label>
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder={t('practice.enterAnswer', { defaultValue: 'Введите ваш ответ...' })}
                          rows={6}
                          className="input-field"
                        />
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => submitMutation.mutate(exercise.id)}
                            disabled={!answer.trim() || submitMutation.isLoading}
                            className="btn-primary disabled:opacity-50"
                          >
                            {submitMutation.isLoading ? t('common.loading') : t('practice.submit')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedExercise(null);
                              setAnswer('');
                              setShowResults(false);
                            }}
                            className="btn-secondary"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedExercise(exercise);
                        setShowResults(false);
                      }}
                      className="btn-primary"
                    >
                      {canSubmit ? t('practice.execute', { defaultValue: 'Выполнить' }) : t('practice.view', { defaultValue: 'Просмотреть' })}
                    </button>
                    {userResult && (
                      <button
                        onClick={() => {
                          setSelectedExercise(exercise);
                          setShowResults(true);
                        }}
                        className="btn-secondary"
                      >
                        {t('practice.myResults', { defaultValue: 'Мои результаты' })}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
