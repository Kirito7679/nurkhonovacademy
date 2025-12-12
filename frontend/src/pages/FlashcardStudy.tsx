import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Flashcard, FlashcardDeck } from '../types';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';

export default function FlashcardStudy() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  const { data: deckResponse, isLoading: deckLoading } = useQuery(
    ['flashcardDeck', id],
    async () => {
      const response = await api.get<ApiResponse<FlashcardDeck>>(`/flashcards/${id}`);
      return response.data.data;
    },
    { enabled: !!id }
  );

  const { data: cardsResponse, isLoading: cardsLoading } = useQuery(
    ['flashcardsToReview', id],
    async () => {
      const response = await api.get<ApiResponse<Flashcard[]>>(`/flashcards/${id}/review`);
      return response.data.data || [];
    },
    { enabled: !!id }
  );

  const updateProgressMutation = useMutation(
    async ({ cardId, difficulty }: { cardId: string; difficulty: string }) => {
      await api.put(`/flashcards/${id}/cards/${cardId}/progress`, { difficulty });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flashcardsToReview', id]);
      },
    }
  );

  const deck = deckResponse;
  const cards = cardsResponse || [];
  const currentCard = cards[currentIndex];

  const handleDifficulty = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    if (!currentCard) return;

    updateProgressMutation.mutate({
      cardId: currentCard.id,
      difficulty,
    });

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
    } else {
      // All cards reviewed
      setSuccessModal({
        isOpen: true,
        message: 'Все карточки изучены! Отличная работа!',
      });
      setTimeout(() => {
        navigate(`/flashcards/${id}`);
      }, 2000);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    queryClient.invalidateQueries(['flashcardsToReview', id]);
  };

  if (deckLoading || cardsLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка карточек...</p>
      </div>
    );
  }

  if (!deck || cards.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-scale">
        <p className="text-neutral-500 mb-4">Нет карточек для изучения</p>
        <button onClick={() => navigate('/flashcards')} className="btn-primary">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Назад к колодам
        </button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/flashcards')}
          className="flex items-center text-neutral-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Назад
        </button>
        <button
          onClick={handleReset}
          className="flex items-center text-neutral-600 hover:text-primary-600 transition-colors"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Начать заново
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
          {deck.title}
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-neutral-600">
            Карточка {currentIndex + 1} из {cards.length}
          </p>
          <div className="w-32 bg-neutral-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div
          className="card p-8 md:p-12 min-h-[400px] flex items-center justify-center cursor-pointer transform transition-transform hover:scale-105"
          onClick={handleFlip}
        >
          <div className="text-center w-full">
            {!showAnswer ? (
              <div>
                <div className="flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-primary-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
                  {currentCard.front}
                </h2>
                <p className="text-sm text-neutral-500">Нажмите, чтобы увидеть ответ</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center mb-4">
                  <EyeOff className="h-6 w-6 text-primary-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
                  {currentCard.back}
                </h2>
                <p className="text-sm text-neutral-500">Нажмите, чтобы вернуться</p>
              </div>
            )}
          </div>
        </div>

        {showAnswer && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleDifficulty('HARD')}
              className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Сложно
            </button>
            <button
              onClick={() => handleDifficulty('MEDIUM')}
              className="btn-secondary text-yellow-600 hover:bg-yellow-50 border-yellow-200"
            >
              Средне
            </button>
            <button
              onClick={() => handleDifficulty('EASY')}
              className="btn-secondary text-green-600 hover:bg-green-50 border-green-200"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Легко
            </button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </div>
  );
}
