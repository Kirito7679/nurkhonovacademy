import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse } from '../types';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import ErrorModal from '../components/ErrorModal';

export default function TeacherPayment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: paymentStatus, isLoading } = useQuery(
    'teacherPaymentStatus',
    async () => {
      const response = await api.get<ApiResponse<{ isPaidTeacher: boolean; needsPayment: boolean }>>('/payments/teacher/status');
      return response.data.data;
    }
  );

  const processPaymentMutation = useMutation(
    async (data: { paymentMethod: 'CARD' | 'PAYPAL' | 'OTHER'; amount: number }) => {
      const response = await api.post<ApiResponse<any>>('/payments/teacher/process', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teacherPaymentStatus');
        queryClient.invalidateQueries('user');
        navigate('/teacher/courses');
      },
      onError: (error: any) => {
        setErrorModal({
          isOpen: true,
          message: error.response?.data?.message || 'Ошибка при обработке оплаты',
        });
      },
    }
  );

  const handlePayment = (method: 'CARD' | 'PAYPAL' | 'OTHER') => {
    // In a real implementation, this would integrate with a payment gateway
    // For now, we'll simulate payment
    processPaymentMutation.mutate({
      paymentMethod: method,
      amount: 10000, // Example amount in cents/sum
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка...</p>
      </div>
    );
  }

  if (paymentStatus?.isPaidTeacher) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Регистрация оплачена
          </h1>
          <p className="text-neutral-600 mb-6">
            Вы можете создавать курсы и классы
          </p>
          <button
            onClick={() => navigate('/teacher/courses')}
            className="btn-primary"
          >
            Перейти к курсам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          Оплата регистрации учителя
        </h1>
      </div>

      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-8 w-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Для создания курсов и классов
            </h2>
            <p className="text-sm text-neutral-600">
              Необходимо оплатить регистрацию учителя
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 mb-1">
                Важная информация
              </p>
              <p className="text-sm text-yellow-700">
                После оплаты вы получите возможность создавать неограниченное количество курсов и классов.
                Оплата производится один раз.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                Стоимость регистрации
              </h3>
              <span className="text-2xl font-bold text-primary-600">
                10 000 сум
              </span>
            </div>
            <p className="text-sm text-neutral-600 mb-6">
              Единоразовая оплата для активации аккаунта учителя
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handlePayment('CARD')}
                disabled={processPaymentMutation.isLoading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processPaymentMutation.isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span>
                    Обработка...
                  </span>
                ) : (
                  'Оплатить картой'
                )}
              </button>

              <button
                onClick={() => handlePayment('PAYPAL')}
                disabled={processPaymentMutation.isLoading}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Оплатить через PayPal
              </button>

              <button
                onClick={() => handlePayment('OTHER')}
                disabled={processPaymentMutation.isLoading}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Другой способ оплаты
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Назад
          </button>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
