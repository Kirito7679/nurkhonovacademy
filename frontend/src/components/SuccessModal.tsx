import { X, CheckCircle } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale">
      <div className="card p-4 md:p-8 w-full max-w-md mx-4 relative animate-slide-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6 animate-pulse-glow">
            <CheckCircle className="h-12 w-12 text-black" />
          </div>
          
          <h3 className="text-2xl font-bold text-gradient mb-4 font-mono">
            <span className="text-[#39ff14]">✓</span> {title}
          </h3>
          
          <p className="text-gray-300 mb-6 font-mono">
            {message}
          </p>
          
          <button
            onClick={onClose}
            className="glow-button px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-neon-glow/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-glow transition-all duration-200 font-mono font-bold relative z-10"
          >
            <span className="relative z-10">OK</span>
          </button>
        </div>
      </div>
    </div>
  );
}

