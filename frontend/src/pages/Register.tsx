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

// Phone validation regex for Uzbekistan format: +998XXXXXXXXX or 998XXXXXXXXX
const phoneRegex = /^(\+?998)?[0-9]{9}$/;

// Password strength validation (must contain letters and numbers)
const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const registerSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное'),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная'),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона. Используйте формат: +998XXXXXXXXX или 998XXXXXXXXX'),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры'),
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
      // Handle different error types
      if ((err as any).isNetworkError) {
        setError('Ошибка сети. Проверьте подключение к интернету и попробуйте снова.');
      } else if ((err as any).isTimeout) {
        setError('Превышено время ожидания. Попробуйте снова.');
      } else {
        setError(err.response?.data?.message || t('errors.somethingWentWrong'));
      }
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
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  className="input-field"
                  placeholder={t('auth.firstName')}
                  aria-invalid={errors.firstName ? 'true' : 'false'}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="mt-1 text-sm text-red-600 font-medium" role="alert">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.lastName')}
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  className="input-field"
                  placeholder={t('auth.lastName')}
                  aria-invalid={errors.lastName ? 'true' : 'false'}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="mt-1 text-sm text-red-600 font-medium" role="alert">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.phone')}
                </label>
                <input
                  {...register('phone')}
                  id="phone"
                  type="text"
                  autoComplete="tel"
                  className="input-field"
                  placeholder="+998901234567"
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600 font-medium" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-primary-800 mb-2">
                  {t('auth.password')}
                </label>
                <input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  placeholder={t('auth.password')}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600 font-medium" role="alert">
                    {errors.password.message}
                  </p>
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

