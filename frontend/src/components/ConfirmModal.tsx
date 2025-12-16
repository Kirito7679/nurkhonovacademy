import { X, AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (!isOpen) return;

    // Focus on cancel button initially
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 100);

    // Trap focus within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div
        ref={modalRef}
        className={`card p-4 md:p-8 w-full max-w-md mx-4 relative animate-slide-in border ${colors.border}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Закрыть"
          tabIndex={0}
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${colors.button} animate-pulse-glow`}>
            <AlertTriangle className={`h-12 w-12 ${colors.icon}`} />
          </div>

          <h3 id="confirm-modal-title" className="text-2xl font-bold text-gradient mb-4 font-mono">
            <span className="text-[#39ff14]">confirm</span>(<span className="text-white">'{title}'</span>)
          </h3>

          <p id="confirm-modal-message" className="text-gray-300 mb-6 font-mono">
            {message}
          </p>

          <div className="flex gap-4 w-full">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#374151] rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1f2937] transition-all font-mono"
              tabIndex={0}
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black ${colors.button} shadow-lg hover:shadow-xl transition-all font-mono font-bold`}
              tabIndex={0}
              autoFocus
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

