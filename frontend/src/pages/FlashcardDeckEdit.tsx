import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, FlashcardDeck, Flashcard } from '../types';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import ErrorModal from '../components/ErrorModal';

export default function FlashcardDeckEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string }>>([]);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: deckResponse, isLoading } = useQuery(
    ['flashcardDeck', id],
    async () => {
      const response = await api.get<ApiResponse<FlashcardDeck>>(`/flashcards/${id}`);
      return response.data.data;
    },
    { enabled: !!id }
  );

  const updateDeckMutation = useMutation(
    async (data: { title: string; description?: string; isPublic: boolean }) => {
      const response = await api.put<ApiResponse<FlashcardDeck>>(`/flashcards/${id}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flashcardDeck', id]);
        navigate('/flashcards');
      },
    }
  );

  const addCardMutation = useMutation(
    async (data: { front: string; back: string }) => {
      const response = await api.post<ApiResponse<Flashcard>>(`/flashcards/${id}/cards`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flashcardDeck', id]);
      },
    }
  );

  useEffect(() => {
    if (deckResponse) {
      setTitle(deckResponse.title);
      setDescription(deckResponse.description || '');
      setIsPublic(deckResponse.isPublic);
      if (deckResponse.flashcards) {
        setFlashcards(deckResponse.flashcards.map(card => ({ front: card.front, back: card.back })));
      }
    }
  }, [deckResponse]);

  const handleAddCard = () => {
    setFlashcards([...flashcards, { front: '', back: '' }]);
  };

  const handleRemoveCard = (index: number) => {
    setFlashcards(flashcards.filter((_, i) => i !== index));
  };

  const handleUpdateCard = (index: number, field: 'front' | 'back', value: string) => {
    const updated = [...flashcards];
    updated[index] = { ...updated[index], [field]: value };
    setFlashcards(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorModal({
        isOpen: true,
        message: 'Введите название колоды',
      });
      return;
    }

    updateDeckMutation.mutate({
      title,
      description: description || undefined,
      isPublic,
    });

    // Add new cards
    flashcards.forEach((card) => {
      if (card.front.trim() && card.back.trim()) {
        addCardMutation.mutate(card);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка колоды...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/flashcards')}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад
      </button>

      <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient mb-8">
        Редактировать колоду
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Название колоды
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Название колоды"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input-field"
                placeholder="Описание колоды..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isPublic" className="text-sm text-neutral-700">
                Публичная колода
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">Карточки</h2>
                <button
                  onClick={handleAddCard}
                  className="btn-secondary text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить карточку
                </button>
              </div>

              <div className="space-y-4">
                {flashcards.map((card, index) => (
                  <div key={index} className="p-4 border border-neutral-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-neutral-700">
                        Карточка {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveCard(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Лицевая сторона</label>
                        <input
                          type="text"
                          value={card.front}
                          onChange={(e) => handleUpdateCard(index, 'front', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Вопрос или слово"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Обратная сторона</label>
                        <input
                          type="text"
                          value={card.back}
                          onChange={(e) => handleUpdateCard(index, 'back', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Ответ или перевод"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={updateDeckMutation.isLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              <Save className="h-5 w-5 mr-2" />
              {updateDeckMutation.isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />
    </div>
  );
}
