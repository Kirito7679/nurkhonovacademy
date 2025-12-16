import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ApiResponse, User, ApiError } from '../types';
import Logo from '../components/Logo';

const registerSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setAuth(user, token);
        navigate('/dashboard');
      }
    } catch (err: ApiError) {
      setError(err.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/50 to-emerald-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <Logo className="h-12 md:h-16" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gradient">
            {t('auth.register')}
          </h2>
          <p className="mt-2 text-center text-sm text-primary-700">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-800 transition-colors underline decoration-2 underline-offset-2">
              {t('auth.login')}
            </Link>
          </p>
        </div>
        <div className="card p-8 shadow-education">
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.firstName')}
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="input-field"
                  placeholder={t('auth.firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.lastName')}
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="input-field"
                  placeholder={t('auth.lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.phone')}
                </label>
                <input
                  {...register('phone')}
                  type="text"
                  autoComplete="tel"
                  className="input-field"
                  placeholder="+998901234567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.password')}
                </label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  placeholder={t('auth.password')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed text-base py-3.5"
              >
                {loading ? t('common.loading') : t('auth.register')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

