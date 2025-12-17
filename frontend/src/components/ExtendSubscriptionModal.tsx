import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse } from '../types';
import { X, Calendar, CreditCard } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

interface ExtendSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  prices: {
    price30Days?: number | null;
    price3Months?: number | null;
    price6Months?: number | null;
    price1Year?: number | null;
  };
  currentEndDate?: string | null;
}

type SubscriptionPeriod = '30_DAYS' | '3_MONTHS' | '6_MONTHS' | '1_YEAR';

const periodLabels: Record<SubscriptionPeriod, string> = {
  '30_DAYS': '30 дней',
  '3_MONTHS': '3 месяца',
  '6_MONTHS': '6 месяцев',
  '1_YEAR': '1 год',
};

export default function ExtendSubscriptionModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  prices,
  currentEndDate,
}: ExtendSubscriptionModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const extendMutation = useMutation(
    async (period: SubscriptionPeriod) => {
      const response = await api.post<ApiResponse<any>>(`/courses/${courseId}/extend`, {
        subscriptionPeriod: period,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['course', courseId]);
        showToast('Подписка успешно продлена!', 'success');
        onClose();
      },
      onError: (error: any) => {
        showToast(
          error.response?.data?.message || 'Ошибка при продлении подписки',
          'error'
        );
      },
    }
  );

  const availablePeriods: Array<{ period: SubscriptionPeriod; price: number }> = [];

  if (prices.price30Days && prices.price30Days > 0) {
    availablePeriods.push({ period: '30_DAYS', price: prices.price30Days });
  }
  if (prices.price3Months && prices.price3Months > 0) {
    availablePeriods.push({ period: '3_MONTHS', price: prices.price3Months });
  }
  if (prices.price6Months && prices.price6Months > 0) {
    availablePeriods.push({ period: '6_MONTHS', price: prices.price6Months });
  }
  if (prices.price1Year && prices.price1Year > 0) {
    availablePeriods.push({ period: '1_YEAR', price: prices.price1Year });
  }

  const handleExtend = () => {
    if (!selectedPeriod) {
      showToast('Выберите период подписки', 'warning');
      return;
    }
    extendMutation.mutate(selectedPeriod);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">Продлить подписку</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">{courseTitle}</h3>
            {currentEndDate && (
              <p className="text-sm text-neutral-600">
                Текущая подписка истекает: {new Date(currentEndDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {availablePeriods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-600">Цены для подписки не установлены</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {availablePeriods.map(({ period, price }) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                      selectedPeriod === period
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary-500" />
                        <div>
                          <div className="font-medium text-neutral-900">
                            {periodLabels[period]}
                          </div>
                          <div className="text-sm text-neutral-600">
                            {selectedPeriod === period && 'Выбрано'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-neutral-900">
                          {price.toLocaleString('ru-RU')} сум
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleExtend}
                  disabled={!selectedPeriod || extendMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {extendMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Обработка...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Продлить</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mt-4 text-xs text-neutral-500 text-center">
                После нажатия кнопки "Продлить" будет создан платеж для оплаты выбранного периода
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
