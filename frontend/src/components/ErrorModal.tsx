import { X, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title = 'Ошибка',
  message,
  buttonText = 'OK',
}: ErrorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Focus on button when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
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

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-scale p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
      aria-describedby="error-modal-message"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-slide-in overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-neutral-600 transition-colors bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white"
          aria-label="Закрыть"
          tabIndex={0}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with error gradient */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 md:p-8 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border-2 border-white/30">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h3 id="error-modal-title" className="text-2xl md:text-3xl font-bold text-white pr-8">
              {title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <div className="space-y-6">
            <p id="error-modal-message" className="text-neutral-700 text-base leading-relaxed">
              {message}
            </p>

            <button
              ref={buttonRef}
              onClick={onClose}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              tabIndex={0}
              autoFocus
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






