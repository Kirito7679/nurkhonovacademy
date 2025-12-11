import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'warning',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: {
      button: 'bg-red-500 hover:bg-red-600',
      icon: 'text-red-400',
      border: 'border-red-500/50',
    },
    warning: {
      button: 'bg-yellow-500 hover:bg-yellow-600',
      icon: 'text-yellow-400',
      border: 'border-yellow-500/50',
    },
    info: {
      button: 'bg-[#39ff14] hover:bg-[#00ff88]',
      icon: 'text-[#39ff14]',
      border: 'border-[#39ff14]/50',
    },
  };

  const colors = variantColors[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale">
      <div className={`card p-4 md:p-8 w-full max-w-md mx-4 relative animate-slide-in border ${colors.border}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${colors.button} animate-pulse-glow`}>
            <AlertTriangle className={`h-12 w-12 ${colors.icon}`} />
          </div>

          <h3 className="text-2xl font-bold text-gradient mb-4 font-mono">
            <span className="text-[#39ff14]">confirm</span>(<span className="text-white">'{title}'</span>)
          </h3>

          <p className="text-gray-300 mb-6 font-mono">
            {message}
          </p>

          <div className="flex gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#374151] rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1f2937] transition-all font-mono"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black ${colors.button} shadow-lg hover:shadow-xl transition-all font-mono font-bold`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

