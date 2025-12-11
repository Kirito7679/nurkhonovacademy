import { X, MessageCircle, DollarSign } from 'lucide-react';

interface CoursePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseTitle: string;
  coursePrice: number;
  teacherTelegram?: string | null;
  isLoading?: boolean;
}

export default function CoursePurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  courseTitle,
  coursePrice,
  teacherTelegram,
  isLoading = false,
}: CoursePurchaseModalProps) {
  if (!isOpen) return null;

  // Форматируем цену
  const formattedPrice = coursePrice > 0
    ? `${coursePrice.toLocaleString('ru-RU')} сум`
    : 'Бесплатно';

  // Формируем ссылку на телеграм
  const telegramLink = teacherTelegram
    ? teacherTelegram.startsWith('http')
      ? teacherTelegram
      : teacherTelegram.startsWith('@')
      ? `https://t.me/${teacherTelegram.slice(1)}`
      : `https://t.me/${teacherTelegram}`
    : 'https://t.me/Nurkhonov_Dilmurod'; // Fallback на дефолтный телеграм

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-scale">
      <div className="card p-8 w-full max-w-md relative animate-slide-in border border-[#39ff14]/50">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[#39ff14] animate-pulse-glow">
            <DollarSign className="h-12 w-12 text-black" />
          </div>

          <h3 className="text-2xl font-bold text-gradient mb-4 font-mono">
            <span className="text-[#39ff14]">const</span>{' '}
            <span className="text-white">coursePrice</span>{' '}
            <span className="text-[#39ff14]">=</span>{' '}
            <span className="text-[#00ff88]">{formattedPrice}</span>;
          </h3>

          <div className="w-full mb-6 space-y-4">
            <p className="text-gray-300 font-mono text-base leading-relaxed">
              <span className="text-[#39ff14]">//</span> Стоимость курса{' '}
              <span className="text-white font-semibold">{formattedPrice}</span>
            </p>
            <p className="text-gray-300 font-mono text-base leading-relaxed">
              <span className="text-[#39ff14]">//</span> Чтобы купить курс, свяжитесь со мной
            </p>
          </div>

          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mb-6 flex items-center justify-center gap-3 px-6 py-3 bg-gradient-primary rounded-lg hover:shadow-lg hover:shadow-[#39ff14]/70 transition-all font-mono font-bold text-black group"
          >
            <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span>Написать в Telegram</span>
          </a>

          <div className="flex gap-4 w-full">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-[#374151] rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1f2937] transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black bg-[#39ff14] hover:bg-[#00ff88] shadow-lg hover:shadow-xl transition-all font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Отправка...</span>
                </>
              ) : (
                'Отправить запрос'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
