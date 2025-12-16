import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, IntermediateTest, IntermediateTestResult } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import ErrorModal from '../components/ErrorModal';

export default function IntermediateTestView() {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<IntermediateTestResult | null>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: testResponse, isLoading } = useQuery(
    ['test', testId],
    async () => {
      const response = await api.get<ApiResponse<IntermediateTest>>(`/tests/${testId}`);
      return response.data.data;
    }
  );

  const submitTestMutation = useMutation(
    async (data: { testId: string; answers: any[]; timeSpent?: number }) => {
      const response = await api.post<ApiResponse<IntermediateTestResult>>(
        `/tests/${testId}/submit`,
        data
      );
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        setResult(data);
        setIsSubmitted(true);
        queryClient.invalidateQueries(['test', testId]);
        queryClient.invalidateQueries('user');
      },
      onError: (error: any) => {
        setErrorModal({
          isOpen: true,
          message: error.response?.data?.message || 'Ошибка при отправке теста',
        });
      },
    }
  );

  useEffect(() => {
    if (!testResponse?.timeLimit) return;

    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [testResponse?.timeLimit]);

  const handleAnswerChange = (questionId: string, optionId: string, isMultiple: boolean) => {
    if (isMultiple) {
      setAnswers((prev) => {
        const current = prev[questionId] || [];
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      });
    } else {
      setAnswers({ ...prev, [questionId]: [optionId] });
    }
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (!testResponse) return;

    const answersArray = testResponse.questions?.map((question) => ({
      questionId: question.id,
      optionIds: answers[question.id] || [],
      textAnswer: textAnswers[question.id] || undefined,
    })) || [];

    submitTestMutation.mutate({
      testId: testId!,
      answers: answersArray,
      timeSpent: timeSpent,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка теста...</p>
      </div>
    );
  }

  if (!testResponse) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">Тест не найден</p>
      </div>
    );
  }

  if (isSubmitted && result) {
    return (
      <div>
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Назад к курсу
        </button>

        <div className="card p-8 text-center">
          {result.passed ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          )}
          
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {result.passed ? 'Тест пройден!' : 'Тест не пройден'}
          </h1>
          
          <div className="mt-6 space-y-2">
            <p className="text-lg">
              <span className="font-semibold">Результат:</span> {result.percentage.toFixed(1)}%
            </p>
            <p className="text-lg">
              <span className="font-semibold">Баллов:</span> {result.score}
            </p>
            {result.timeSpent && (
              <p className="text-lg">
                <span className="font-semibold">Время:</span> {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>

          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="btn-primary mt-6"
          >
            Вернуться к курсу
          </button>
        </div>
      </div>
    );
  }

  const timeRemaining = testResponse.timeLimit
    ? testResponse.timeLimit * 60 - timeSpent
    : null;

  return (
    <div>
      <button
        onClick={() => navigate(`/courses/${courseId}`)}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад к курсу
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{testResponse.title}</h1>
            {testResponse.description && (
              <p className="text-neutral-600 mt-2">{testResponse.description}</p>
            )}
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" />
              <span>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {testResponse.questions?.map((question, index) => (
          <div key={question.id} className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-neutral-900 mb-2">{question.question}</p>
                <p className="text-sm text-neutral-600">
                  {question.type === 'SINGLE' ? 'Выберите один ответ' : 
                   question.type === 'MULTIPLE' ? 'Выберите несколько ответов' : 
                   'Введите текстовый ответ'} • 
                  Баллов: {question.points}
                </p>
              </div>
            </div>

            {question.type === 'TEXT' ? (
              <textarea
                value={textAnswers[question.id] || ''}
                onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Введите ваш ответ..."
              />
            ) : (
              <div className="space-y-2">
                {question.options?.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type={question.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                      name={question.id}
                      checked={(answers[question.id] || []).includes(option.id)}
                      onChange={() => handleAnswerChange(question.id, option.id, question.type === 'MULTIPLE')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="flex-1">{option.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitTestMutation.isLoading}
          className="btn-primary disabled:opacity-50"
        >
          {submitTestMutation.isLoading ? 'Отправка...' : 'Отправить тест'}
        </button>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
