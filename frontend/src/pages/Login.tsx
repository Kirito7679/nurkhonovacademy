import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { ApiResponse, User } from '../types';
import SupportButton from '../components/SupportButton';

const loginSchema = z.object({
  phone: z.string().min(1, 'Номер телефона обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data);
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setAuth(user, token);
        
        // Redirect based on role
        if (user.role === 'TEACHER' || user.role === 'ADMIN') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] py-12 px-4 sm:px-6 lg:px-8 relative">
      <SupportButton />
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gradient">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Или{' '}
            <Link to="/register" className="font-medium text-neon-glow hover:text-neon-300 transition-colors">
              зарегистрируйтесь
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                Номер телефона
              </label>
              <input
                {...register('phone')}
                type="text"
                autoComplete="tel"
                className="w-full px-4 py-3 bg-[#111827] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-glow focus:border-transparent transition-all"
                placeholder="+998901234567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-[#111827] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-glow focus:border-transparent transition-all"
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-neon-glow transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-primary hover:shadow-lg hover:shadow-neon-glow/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

