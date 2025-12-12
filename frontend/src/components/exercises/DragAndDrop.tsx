import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ErrorModal from '../ErrorModal';

interface DragItem {
  id: string;
  content: string;
}

interface DropZone {
  id: string;
  label: string;
  correctItemId: string;
}

interface DragAndDropProps {
  items: DragItem[];
  dropZones: DropZone[];
  onComplete?: (isCorrect: boolean) => void;
}

export default function DragAndDrop({ items, dropZones, onComplete }: DragAndDropProps) {
  const { t } = useTranslation();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [zoneItems, setZoneItems] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (zoneId: string) => {
    if (draggedItem) {
      setZoneItems((prev) => ({
        ...prev,
        [zoneId]: draggedItem,
      }));
      setDraggedItem(null);
    }
  };

  const handleCheck = () => {
    const allZonesFilled = dropZones.every((zone) => zoneItems[zone.id]);
    if (!allZonesFilled) {
      setErrorModal({
        isOpen: true,
        message: t('exercises.fillAllZones', { defaultValue: 'Пожалуйста, заполните все зоны' }),
      });
      return;
    }

    const correct = dropZones.every(
      (zone) => zoneItems[zone.id] === zone.correctItemId
    );
    setIsCorrect(correct);
    setIsCompleted(true);
    onComplete?.(correct);
  };

  const handleReset = () => {
    setZoneItems({});
    setIsCompleted(false);
    setIsCorrect(false);
  };

  const getItemInZone = (zoneId: string) => {
    const itemId = zoneItems[zoneId];
    return items.find((item) => item.id === itemId);
  };

  const isItemInZone = (itemId: string) => {
    return Object.values(zoneItems).includes(itemId);
  };

  return (
    <div className="space-y-6">
      {/* Drop Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dropZones.map((zone) => {
          const item = getItemInZone(zone.id);
          const isCorrectZone = isCompleted && item?.id === zone.correctItemId;
          const isWrongZone = isCompleted && item && item.id !== zone.correctItemId;

          return (
            <div
              key={zone.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(zone.id)}
              className={`min-h-[120px] p-4 rounded-lg border-2 border-dashed transition-all ${
                item
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-300 bg-neutral-50'
              } ${
                isCorrectZone
                  ? 'border-green-500 bg-green-50'
                  : ''
              } ${
                isWrongZone
                  ? 'border-red-500 bg-red-50'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-700">
                  {zone.label}
                </span>
                {isCompleted && (
                  <>
                    {isCorrectZone && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {isWrongZone && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </>
                )}
              </div>
              {item ? (
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  {item.content}
                </div>
              ) : (
                <div className="text-sm text-neutral-400 text-center py-4">
                  {t('exercises.dragItemHere', { defaultValue: 'Перетащите элемент сюда' })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Draggable Items */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => {
          const isUsed = isItemInZone(item.id);
          return (
            <div
              key={item.id}
              draggable={!isCompleted && !isUsed}
              onDragStart={() => handleDragStart(item.id)}
              className={`p-4 rounded-lg border-2 cursor-move transition-all ${
                isUsed
                  ? 'opacity-50 cursor-not-allowed border-neutral-200 bg-neutral-100'
                  : 'border-primary-300 bg-white hover:border-primary-500 hover:shadow-md'
              }`}
            >
              {item.content}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!isCompleted ? (
        <button
          onClick={handleCheck}
          className="btn-primary w-full"
        >
          {t('exercises.check', { defaultValue: 'Проверить' })}
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className={`p-4 rounded-lg ${
              isCorrect
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-red-50 border-2 border-red-500'
            }`}
          >
            <p className="font-semibold text-center">
              {isCorrect ? t('exercises.correct', { defaultValue: '✓ Правильно!' }) : t('exercises.incorrect', { defaultValue: '✗ Неправильно. Попробуйте еще раз.' })}
            </p>
          </div>
          <button onClick={handleReset} className="btn-secondary w-full">
            {t('exercises.tryAgain', { defaultValue: 'Попробовать снова' })}
          </button>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />
    </div>
  );
}
