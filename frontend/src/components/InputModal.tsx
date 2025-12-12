import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  required?: boolean;
}

export default function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  placeholder,
  confirmText = 'OK',
  cancelText = 'Отмена',
  defaultValue = '',
  required = true,
}: InputModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Focus input after modal opens
      setTimeout(() => {
        const input = document.getElementById('input-modal-field');
        input?.focus();
      }, 100);
    } else {
      setValue('');
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (required && !value.trim()) {
      return;
    }
    const trimmedValue = value.trim();
    setValue('');
    onConfirm(trimmedValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-scale p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-slide-in overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-neutral-600 transition-colors bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 md:p-8 pb-6">
          <h3 className="text-2xl md:text-3xl font-bold text-white pr-8">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="input-modal-field"
                className="block text-sm font-semibold text-neutral-900 mb-2"
              >
                {label}
              </label>
              <input
                id="input-modal-field"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-4 py-3 border-2 border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={required && !value.trim()}
                className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

