import { useQuery } from 'react-query';
import api from '../services/api';
import { ApiResponse } from '../types';
import { TrendingUp, BookOpen, CheckCircle, Clock, Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface FlashcardAnalyticsProps {
  deckId: string;
}

interface FlashcardAnalyticsData {
  deckId: string;
  deckTitle: string;
  totalCards: number;
  studiedCards: number;
  studiedPercentage: number;
  unstudiedCards: number;
  difficultyDistribution: {
    NEW: number;
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
  averageReviewCount: number;
  dueForReview: number;
  masteredCards: number;
  masteryPercentage: number;
}

export default function FlashcardAnalytics({ deckId }: FlashcardAnalyticsProps) {
  const { data: analyticsResponse, isLoading } = useQuery<ApiResponse<FlashcardAnalyticsData>>(
    ['flashcardAnalytics', deckId],
    async () => {
      const response = await api.get<ApiResponse<FlashcardAnalyticsData>>(`/flashcards/${deckId}/analytics`);
      return response.data;
    }
  );

  const analytics = analyticsResponse?.data;

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const difficultyData = [
    { name: 'Новые', value: analytics.difficultyDistribution.NEW, color: '#94a3b8' },
    { name: 'Сложные', value: analytics.difficultyDistribution.HARD, color: '#ef4444' },
    { name: 'Средние', value: analytics.difficultyDistribution.MEDIUM, color: '#f59e0b' },
    { name: 'Легкие', value: analytics.difficultyDistribution.EASY, color: '#10b981' },
  ].filter(item => item.value > 0);

  const progressData = [
    { name: 'Изучено', value: analytics.studiedCards, color: '#10b981' },
    { name: 'Не изучено', value: analytics.unstudiedCards, color: '#e5e7eb' },
  ];

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-primary-600" />
        <h3 className="text-xl font-bold text-neutral-900">
          Аналитика: {analytics.deckTitle}
        </h3>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary-50 to-primary-50 p-4 rounded-xl border-2 border-primary-200">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="h-5 w-5 text-primary-600" />
            <span className="text-2xl font-bold text-primary-700">
              {analytics.totalCards}
            </span>
          </div>
          <p className="text-sm text-neutral-600">Всего карточек</p>
        </div>

        <div className="bg-gradient-to-br from-accent-50 to-accent-50 p-4 rounded-xl border-2 border-accent-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-accent-600" />
            <span className="text-2xl font-bold text-accent-700">
              {analytics.studiedCards}
            </span>
          </div>
          <p className="text-sm text-neutral-600">
            Изучено ({analytics.studiedPercentage}%)
          </p>
        </div>

        <div className="bg-gradient-to-br from-education-50 to-education-50 p-4 rounded-xl border-2 border-education-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-education-600" />
            <span className="text-2xl font-bold text-education-700">
              {analytics.dueForReview}
            </span>
          </div>
          <p className="text-sm text-neutral-600">К повторению</p>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-accent-50 p-4 rounded-xl border-2 border-primary-200">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-5 w-5 text-primary-600" />
            <span className="text-2xl font-bold text-primary-700">
              {analytics.masteredCards}
            </span>
          </div>
          <p className="text-sm text-neutral-600">
            Освоено ({analytics.masteryPercentage}%)
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Difficulty Distribution */}
        {difficultyData.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-neutral-900 mb-4">
              Распределение по сложности
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Progress Chart */}
        <div>
          <h4 className="text-lg font-semibold text-neutral-900 mb-4">
            Прогресс изучения
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {progressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 p-4 bg-primary-50 rounded-xl border-2 border-primary-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h4 className="font-semibold text-neutral-900">Дополнительная статистика</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-600">Среднее количество повторений</p>
            <p className="text-lg font-bold text-primary-700">
              {analytics.averageReviewCount}
            </p>
          </div>
          <div>
            <p className="text-neutral-600">Процент изучения</p>
            <p className="text-lg font-bold text-primary-700">
              {analytics.studiedPercentage}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
