import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, ExternalIntegration } from '../types';
import { Plus, Trash2, ExternalLink, FileText, BookOpen, Youtube } from 'lucide-react';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Integrations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [integrationType, setIntegrationType] = useState<'GOOGLE_DOCS' | 'QUIZLET' | 'YOUTUBE' | 'OTHER'>('QUIZLET');
  const [externalId, setExternalId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    integrationId: string | null;
  }>({ isOpen: false, integrationId: null });

  const { data: integrationsResponse, isLoading } = useQuery(
    'integrations',
    async () => {
      const response = await api.get<ApiResponse<ExternalIntegration[]>>('/integrations');
      return response.data.data || [];
    }
  );

  const createMutation = useMutation(
    async (data: Partial<ExternalIntegration>) => {
      const response = await api.post<ApiResponse<ExternalIntegration>>('/integrations', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('integrations');
        setShowCreateForm(false);
        setExternalId('');
        setExternalUrl('');
      },
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      await api.delete(`/integrations/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('integrations');
      },
    }
  );

  const handleCreate = () => {
    if (!externalId || !externalUrl) {
      setErrorModal({
        isOpen: true,
        message: t('errors.fillAllFields', { defaultValue: 'Заполните все поля' }),
      });
      return;
    }

    createMutation.mutate({
      type: integrationType,
      externalId,
      externalUrl,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'GOOGLE_DOCS':
        return <FileText className="h-5 w-5" />;
      case 'QUIZLET':
        return <BookOpen className="h-5 w-5" />;
      case 'YOUTUBE':
        return <Youtube className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  const integrations = integrationsResponse || [];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка интеграций...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {t('integrations.title')}
        </h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('integrations.addIntegration')}
        </button>
      </div>

      {showCreateForm && (
        <div className="card p-6 mb-6 animate-fade-scale">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">{t('integrations.createIntegration', { defaultValue: 'Создать интеграцию' })}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('integrations.integrationType')}
              </label>
              <select
                value={integrationType}
                onChange={(e) => setIntegrationType(e.target.value as 'GOOGLE_DOCS' | 'QUIZLET' | 'YOUTUBE' | 'OTHER')}
                className="input-field"
              >
                <option value="QUIZLET">Quizlet</option>
                <option value="GOOGLE_DOCS">Google Docs</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="OTHER">{t('integrations.other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('integrations.externalId')}
              </label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder={t('integrations.externalIdPlaceholder', { defaultValue: 'ID ресурса во внешнем сервисе' })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                URL
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="input-field"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={createMutation.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {createMutation.isLoading ? t('common.loading') : t('common.create')}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setExternalId('');
                  setExternalUrl('');
                }}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <ExternalLink className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">{t('integrations.noIntegrations')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="card p-6 hover:shadow-lg transition-all animate-fade-scale"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                    {getIcon(integration.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{integration.type}</h3>
                    <p className="text-xs text-neutral-500">ID: {integration.externalId}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      integrationId: integration.id,
                    });
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <a
                href={integration.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full text-center flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('integrations.open')}
              </a>
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
        onClose={() => setConfirmModal({ isOpen: false, integrationId: null })}
        onConfirm={() => {
          if (confirmModal.integrationId) {
            deleteMutation.mutate(confirmModal.integrationId);
            setConfirmModal({ isOpen: false, integrationId: null });
          }
        }}
        title={t('integrations.deleteIntegration', { defaultValue: 'Удалить интеграцию' })}
        message={t('integrations.deleteConfirm', { defaultValue: 'Удалить интеграцию?' })}
        variant="danger"
      />
    </div>
  );
}
