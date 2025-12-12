import { useState } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Flashcard, FlashcardProgress } from '../types';

interface FlashcardsProps {
  flashcards: Flashcard[];
  progress?: (FlashcardProgress & { flashcardId: string })[];
  onReview?: (flashcardId: string, correct: boolean) => void;
}

export default function Flashcards({ flashcards, progress = [], onReview }: FlashcardsProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const currentCard = flashcards[currentIndex];
  const cardProgress = progress.find((p) => p.flashcardId === currentCard?.id);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (correct: boolean) => {
    if (currentCard && onReview) {
      onReview(currentCard.id, correct);
      setReviewed((prev) => new Set(prev).add(currentCard.id));
    }
    setIsFlipped(false);
    
    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All cards reviewed, restart
        setCurrentIndex(0);
        setReviewed(new Set());
      }
    }, 500);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">{t('flashcards.noCards', { defaultValue: 'Нет карточек для изучения' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>
          {t('flashcards.cardProgress', { current: currentIndex + 1, total: flashcards.length, defaultValue: `Карточка ${currentIndex + 1} из ${flashcards.length}` })}
        </span>
        {cardProgress && (
          <span className="text-primary-600">
            {t('flashcards.level', { level: cardProgress.level, defaultValue: `Уровень: ${cardProgress.level}/5` })}
          </span>
        )}
      </div>

      {/* Flashcard */}
      <div
        className="relative h-64 perspective-1000"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full preserve-3d transition-transform duration-500 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 backface-hidden ${
              isFlipped ? 'hidden' : ''
            }`}
          >
            <div className="card h-full flex items-center justify-center p-8 cursor-pointer hover:scale-105 transition-transform">
              <div className="text-center">
                <p className="text-lg font-semibold text-neutral-700 mb-2">
                  {t('flashcard.front')}
                </p>
                <p className="text-2xl font-bold text-neutral-900">
                  {currentCard.front}
                </p>
                <p className="text-sm text-neutral-500 mt-4">
                  {t('flashcards.clickToFlip', { defaultValue: 'Нажмите, чтобы перевернуть' })}
                </p>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 ${
              !isFlipped ? 'hidden' : ''
            }`}
          >
            <div className="card h-full flex items-center justify-center p-8 cursor-pointer hover:scale-105 transition-transform">
              <div className="text-center">
                <p className="text-lg font-semibold text-neutral-700 mb-2">
                  {t('flashcard.back')}
                </p>
                <p className="text-2xl font-bold text-neutral-900">
                  {currentCard.back}
                </p>
                {!reviewed.has(currentCard.id) && (
                  <div className="flex gap-3 justify-center mt-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(false);
                      }}
                      className="p-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(true);
                      }}
                      className="p-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
          {t('common.back')}
        </button>

        <button
          onClick={handleFlip}
          className="p-3 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
        >
          <RotateCw className="h-6 w-6" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('flashcard.next')}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
