import { X } from 'lucide-react';

interface FileUploadProgressProps {
  fileName: string;
  progress: number; // 0-100
  onCancel?: () => void;
  error?: string;
}

export default function FileUploadProgress({ 
  fileName, 
  progress, 
  onCancel,
  error 
}: FileUploadProgressProps) {
  return (
    <div className="mb-4 p-4 bg-primary-50 dark:bg-neutral-800 border-2 border-primary-200 dark:border-neutral-700 rounded-xl animate-slide-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {fileName}
          </p>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          )}
        </div>
        {onCancel && !error && (
          <button
            onClick={onCancel}
            className="ml-2 p-1 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Отменить загрузку"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {!error && (
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {!error && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 text-right">
          {progress}%
        </p>
      )}
    </div>
  );
}
