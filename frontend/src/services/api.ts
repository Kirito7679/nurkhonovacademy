import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { ApiResponse } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for regular requests
  timeoutErrorMessage: 'Превышено время ожидания ответа от сервера',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData (multipart/form-data)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // Request timeout
        return Promise.reject({
          ...error,
          response: {
            ...error.response,
            data: {
              success: false,
              message: 'Превышено время ожидания. Проверьте подключение к интернету и попробуйте снова.',
            },
          },
          isTimeout: true,
        });
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        // Network error (no internet connection)
        return Promise.reject({
          ...error,
          response: {
            ...error.response,
            data: {
              success: false,
              message: 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.',
            },
          },
          isNetworkError: true,
        });
      }
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      
      // Log error but don't show to user for rate limit errors (unless it's auth)
      const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/auth/register');
      
      if (import.meta.env.DEV || isAuthRequest) {
        console.warn(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`);
      }
      
      // Return error with retry info
      return Promise.reject({
        ...error,
        retryAfter: retryAfterSeconds,
        isRateLimit: true,
        response: {
          ...error.response,
          data: {
            success: false,
            message: `Слишком много запросов. Попробуйте снова через ${retryAfterSeconds} секунд.`,
          },
        },
      });
    }
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      // Only redirect if not already on login/register page and not during login/register requests
      const currentPath = window.location.pathname;
      const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/auth/register');
      
      // Don't redirect on login/register pages or during auth requests
      if (!isAuthRequest && currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: error.response.data?.message || 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.',
          },
        },
      });
    }

    // Handle 400 Bad Request - provide more specific error messages
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.message || 'Неверный запрос. Проверьте введенные данные.';
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: errorMessage,
          },
        },
      });
    }

    // For other errors, ensure we have a message
    if (error.response && !error.response.data?.message) {
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: `Ошибка ${error.response.status}: ${error.response.statusText || 'Неизвестная ошибка'}`,
          },
        },
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;

