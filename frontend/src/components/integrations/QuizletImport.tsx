import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { ApiResponse } from '../../types';

interface QuizletImportProps {
  lessonId: string;
  onImportComplete?: (flashcards: any[]) => void;
}

export default function QuizletImport({ lessonId, onImportComplete }: QuizletImportProps) {
  const { t } = useTranslation();
  const [quizletUrl, setQuizletUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImport = async () => {
    if (!quizletUrl.trim()) {
      setError(t('integrations.enterQuizletUrl', { defaultValue: 'Введите URL набора Quizlet' }));
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(false);

    try {
      // Extract Quizlet set ID from URL
      const setIdMatch = quizletUrl.match(/quizlet\.com\/([^\/]+)\/([^\/]+)/);
      if (!setIdMatch) {
        throw new Error(t('integrations.invalidQuizletUrl', { defaultValue: 'Неверный формат URL Quizlet' }));
      }

      // In a real implementation, you would:
      // 1. Call Quizlet API to fetch the set
      // 2. Parse the flashcards
      // 3. Create flashcards in your database
      
      // For now, this is a placeholder
      // You would need to implement Quizlet API integration
      const response = await api.post<ApiResponse<any[]>>('/api/flashcards/import-quizlet', {
        lessonId,
        quizletUrl,
      });

      setSuccess(true);
      onImportComplete?.(response.data.data || []);
      setQuizletUrl('');
    } catch (err: any) {
      setError(err.response?.data?.message || t('integrations.importError', { defaultValue: 'Ошибка при импорте карточек' }));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
        {t('integrations.importFromQuizlet', { defaultValue: 'Импорт из Quizlet' })}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {t('integrations.quizletSetUrl', { defaultValue: 'URL набора Quizlet' })}
          </label>
          <input
            type="url"
            value={quizletUrl}
            onChange={(e) => setQuizletUrl(e.target.value)}
            placeholder="https://quizlet.com/..."
            className="input-field"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {t('integrations.pasteQuizletLink', { defaultValue: 'Вставьте ссылку на набор карточек Quizlet' })}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700">
              {t('integrations.importSuccess', { defaultValue: 'Карточки успешно импортированы!' })}
            </p>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={isImporting || !quizletUrl.trim()}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="h-5 w-5" />
          {isImporting ? t('common.loading') : t('integrations.importCards', { defaultValue: 'Импортировать карточки' })}
        </button>
      </div>
    </div>
  );
}
