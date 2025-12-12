import { X, MessageCircle, DollarSign, CheckCircle, Gift, BookOpen } from 'lucide-react';

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

  const isFreeCourse = coursePrice === 0;
  
  // Форматируем цену
  const formattedPrice = isFreeCourse
    ? 'Бесплатно'
    : `${coursePrice.toLocaleString('ru-RU')} сум`;

  // Формируем ссылку на телеграм
  const telegramLink = teacherTelegram
    ? teacherTelegram.startsWith('http')
      ? teacherTelegram
      : teacherTelegram.startsWith('@')
      ? `https://t.me/${teacherTelegram.slice(1)}`
      : `https://t.me/${teacherTelegram}`
    : 'https://t.me/Nurkhonov_Dilmurod'; // Fallback на дефолтный телеграм

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-scale p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-slide-in overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with gradient background for free courses */}
        <div className={`${isFreeCourse ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500' : 'bg-gradient-to-br from-primary-500 to-primary-600'} p-6 md:p-8 pb-8`}>
          <div className="flex flex-col items-center text-center text-white">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
              isFreeCourse 
                ? 'bg-white/20 backdrop-blur-sm border-2 border-white/30' 
                : 'bg-white/20 backdrop-blur-sm border-2 border-white/30'
            }`}>
              {isFreeCourse ? (
                <Gift className="h-10 w-10 text-white" />
              ) : (
                <DollarSign className="h-10 w-10 text-white" />
              )}
            </div>

            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              {isFreeCourse ? 'Бесплатный курс' : 'Стоимость курса'}
            </h3>

            <div className="mb-2">
              <p className="text-4xl md:text-5xl font-bold mb-1">
                {formattedPrice}
              </p>
              {isFreeCourse && (
                <p className="text-white/90 text-sm md:text-base">
                  Начните обучение прямо сейчас!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {isFreeCourse ? (
            // Free course content
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                  {courseTitle}
                </h4>
                <p className="text-neutral-600 text-sm">
                  После подтверждения курс будет автоматически добавлен в ваш список доступных курсов
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Мгновенный доступ
                    </p>
                    <p className="text-xs text-green-700">
                      Курс будет доступен сразу после подтверждения
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Все материалы включены
                    </p>
                    <p className="text-xs text-green-700">
                      Получите доступ ко всем урокам и материалам курса
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border-2 border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Обработка...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Начать обучение</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Paid course content
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                  {courseTitle}
                </h4>
                <p className="text-neutral-600 text-sm">
                  Чтобы купить курс, свяжитесь с преподавателем в Telegram
                </p>
              </div>

              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all font-semibold shadow-md hover:shadow-lg group"
              >
                <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Написать в Telegram</span>
              </a>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border-2 border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          )}
        </div>
      </div>
    </div>
  );
}
