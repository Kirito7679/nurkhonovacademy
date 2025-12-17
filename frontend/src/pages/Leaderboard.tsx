import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ApiResponse } from '../types';
import { Trophy, Medal, Award, Coins, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  rank: number;
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  coins: number;
  completedLessons: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  totalParticipants: number;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery(
    'leaderboard',
    async () => {
      const response = await api.get<ApiResponse<LeaderboardData>>('/leaderboard');
      return response.data.data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-neutral-600">#{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
    return 'bg-white border-neutral-200';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">{t('error.loading', { defaultValue: 'Ошибка загрузки данных' })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
            {t('leaderboard.title', { defaultValue: 'Таблица лидеров' })}
          </h1>
          <p className="text-neutral-600">
            {t('leaderboard.subtitle', { defaultValue: 'Студенты с наибольшим количеством коинов' })}
          </p>
        </div>

        {/* User's Rank Card */}
        {user && data?.userRank && (
          <div className="bg-primary-50 border-2 border-primary-300 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('leaderboard.yourRank', { defaultValue: 'Ваш рейтинг' })}: #{data.userRank}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="text-xl font-bold text-neutral-900">{user.coins || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-3">
          {data?.leaderboard && data.leaderboard.length > 0 ? (
            data.leaderboard.map((entry) => {
              const isCurrentUser = user?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`${getRankBgColor(entry.rank)} border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
                    isCurrentUser ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={`${entry.firstName} ${entry.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-white" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1">
                        <p className={`font-semibold ${isCurrentUser ? 'text-primary-700' : 'text-neutral-900'}`}>
                          {entry.firstName} {entry.lastName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-0.5 rounded">
                              {t('leaderboard.you', { defaultValue: 'Вы' })}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {entry.completedLessons} {t('leaderboard.lessonsCompleted', { defaultValue: 'уроков завершено' })}
                        </p>
                      </div>
                    </div>

                    {/* Coins */}
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-xl font-bold text-neutral-900">{entry.coins}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
              <p className="text-neutral-600">
                {t('leaderboard.empty', { defaultValue: 'Пока нет участников в таблице лидеров' })}
              </p>
            </div>
          )}
        </div>

        {/* Total Participants */}
        {data && data.totalParticipants > 0 && (
          <div className="mt-6 text-center text-sm text-neutral-600">
            {t('leaderboard.totalParticipants', {
              defaultValue: 'Всего участников: {{count}}',
              count: data.totalParticipants,
            })}
          </div>
        )}
      </div>
    </div>
  );
}
