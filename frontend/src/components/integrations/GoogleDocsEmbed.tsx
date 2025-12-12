import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FileText } from 'lucide-react';

interface GoogleDocsEmbedProps {
  docUrl: string;
  title?: string;
  width?: string;
  height?: string;
}

export default function GoogleDocsEmbed({ docUrl, title, width = '100%', height = '600px' }: GoogleDocsEmbedProps) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);

  // Convert Google Docs URL to embed format
  const getEmbedUrl = (url: string) => {
    // Extract document ID from various Google Docs URL formats
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (docIdMatch) {
      return `https://docs.google.com/document/d/${docIdMatch[1]}/preview`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(docUrl);
  const openInNewTab = () => {
    window.open(docUrl, '_blank');
  };

  if (error) {
    return (
      <div className="card p-6 text-center">
        <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 mb-4">
          {t('integrations.failedToLoad', { defaultValue: 'Не удалось загрузить документ' })}
        </p>
        <button onClick={openInNewTab} className="btn-secondary inline-flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          {t('integrations.openInNewTab', { defaultValue: 'Открыть в новой вкладке' })}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900">{title}</h3>
          <button
            onClick={openInNewTab}
            className="text-primary-600 hover:text-primary-700 transition-colors"
            title={t('integrations.openInNewTab', { defaultValue: 'Открыть в новой вкладке' })}
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>
      )}
      <iframe
        src={embedUrl}
        width={width}
        height={height}
        className="border-0 rounded-lg"
        onError={() => setError(true)}
        title={title || 'Google Docs Document'}
      />
    </div>
  );
}
