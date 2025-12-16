import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, FlashcardDeck } from '../types';
import { Plus, BookOpen, Eye, Edit2, Trash2, Lock, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';
import FlashcardAnalytics from '../components/FlashcardAnalytics';

export default function FlashcardDecks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [selectedDeckForAnalytics, setSelectedDeckForAnalytics] = useState<string | null>(null);
  
  // Modal states
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    deckId: string | null;
  }>({ isOpen: false, deckId: null });

  const { data: decksResponse, isLoading } = useQuery(
    'flashcardDecks',
    async () => {
      const response = await api.get<ApiResponse<FlashcardDeck[]>>('/flashcards');
      return response.data.data || [];
    }
  );

  const createDeckMutation = useMutation(
    async (data: { title: string; description?: string; isPublic: boolean }) => {
      const response = await api.post<ApiResponse<FlashcardDeck>>('/flashcards', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('flashcardDecks');
        setShowCreateForm(false);
        setNewDeckTitle('');
        setNewDeckDescription('');
      },
    }
  );

  const deleteDeckMutation = useMutation(
    async (deckId: string) => {
      await api.delete(`/flashcards/${deckId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('flashcardDecks');
      },
    }
  );

  const handleCreateDeck = () => {
    if (!newDeckTitle.trim()) {
      setErrorModal({
        isOpen: true,
        message: t('flashcards.enterTitle', { defaultValue: 'Введите название колоды' }),
      });
      return;
    }

    createDeckMutation.mutate({
      title: newDeckTitle,
      description: newDeckDescription || undefined,
      isPublic: false,
    });
  };

  const handleDeleteDeck = (deckId: string) => {
    setConfirmModal({
      isOpen: true,
      deckId,
    });
  };

  const canCreate = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">{t('common.loading')}</p>
      </div>
    );
  }

  const decks = decksResponse || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {t('flashcards.title')}
        </h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('flashcards.createDeck')}
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="card p-6 mb-6 animate-fade-scale">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">{t('flashcards.createNewDeck', { defaultValue: 'Создать новую колоду' })}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('flashcards.deckTitle')}
              </label>
              <input
                type="text"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                placeholder={t('flashcards.deckTitleExample', { defaultValue: 'Например: Английские слова' })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('flashcards.deckDescription')} ({t('common.optional')})
              </label>
              <textarea
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                placeholder={t('flashcards.deckDescriptionPlaceholder', { defaultValue: 'Описание колоды...' })}
                rows={3}
                className="input-field"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateDeck}
                disabled={createDeckMutation.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {createDeckMutation.isLoading ? t('common.loading') : t('common.create')}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewDeckTitle('');
                  setNewDeckDescription('');
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <BookOpen className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">{t('flashcards.noDecks')}</p>
          {canCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary mt-4"
            >
              {t('flashcards.createFirstDeck', { defaultValue: 'Создать первую колоду' })}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="card p-6 hover:shadow-lg transition-all animate-fade-scale"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {deck._count?.flashcards || 0} {t('flashcards.cards')}
                    </span>
                    {deck.isPublic ? (
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {t('flashcards.public')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Lock className="h-4 w-4" />
                        {t('flashcards.private')}
                      </span>
                    )}
                  </div>
                  {deck.creator && (
                    <p className="text-xs text-neutral-400 mt-2">
                      {t('flashcards.author', { defaultValue: 'Автор' })}: {deck.creator.firstName} {deck.creator.lastName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/flashcards/${deck.id}/study`}
                  className="btn-primary flex-1 text-center"
                >
                  {t('flashcards.study')}
                </Link>
                <button
                  onClick={() => setSelectedDeckForAnalytics(selectedDeckForAnalytics === deck.id ? null : deck.id)}
                  className="btn-secondary"
                  title="Аналитика"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                {canCreate && deck.createdBy === user?.id && (
                  <>
                    <Link
                      to={`/flashcards/${deck.id}/edit`}
                      className="btn-secondary"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="btn-secondary text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {selectedDeckForAnalytics === deck.id && (
                <div className="mt-4">
                  <FlashcardAnalytics deckId={deck.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, deckId: null })}
        onConfirm={() => {
          if (confirmModal.deckId) {
            deleteDeckMutation.mutate(confirmModal.deckId);
            setConfirmModal({ isOpen: false, deckId: null });
          }
        }}
        title={t('flashcards.deleteDeck', { defaultValue: 'Удалить колоду' })}
        message={t('flashcards.deleteConfirm', { defaultValue: 'Вы уверены, что хотите удалить эту колоду?' })}
        variant="danger"
      />
    </div>
  );
}
