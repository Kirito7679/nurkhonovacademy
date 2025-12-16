import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function LoadingButton({
  isLoading = false,
  disabled = false,
  children,
  className = '',
  type = 'button',
  onClick,
  variant = 'primary',
}: LoadingButtonProps) {
  const baseClasses = variant === 'primary'
    ? 'btn-primary'
    : variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200'
    : 'btn-secondary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${className} disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2`}
      aria-busy={isLoading}
    >
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
