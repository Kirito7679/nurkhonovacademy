import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import ErrorModal from '../ErrorModal';

interface MatchingItem {
  id: string;
  left: string;
  right: string;
}

interface MatchingProps {
  items: MatchingItem[];
  onComplete?: (isCorrect: boolean) => void;
}

export default function Matching({ items, onComplete }: MatchingProps) {
  const { t } = useTranslation();
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const handleLeftClick = (leftId: string) => {
    if (matches[leftId]) return; // Already matched
    
    if (selectedLeft === leftId) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(leftId);
      if (selectedRight) {
        // Create match
        setMatches((prev) => ({
          ...prev,
          [leftId]: selectedRight,
        }));
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  const handleRightClick = (rightId: string) => {
    // Check if already matched
    const isMatched = Object.values(matches).includes(rightId);
    if (isMatched) return;

    if (selectedRight === rightId) {
      setSelectedRight(null);
    } else {
      setSelectedRight(rightId);
      if (selectedLeft) {
        // Create match
        setMatches((prev) => ({
          ...prev,
          [selectedLeft]: rightId,
        }));
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  const handleCheck = () => {
    if (Object.keys(matches).length !== items.length) {
      setErrorModal({
        isOpen: true,
        message: t('exercises.matchAllItems', { defaultValue: 'Пожалуйста, сопоставьте все элементы' }),
      });
      return;
    }

    const correct = items.every((item) => matches[item.id] === item.right);
    setIsCorrect(correct);
    setIsCompleted(true);
    onComplete?.(correct);
  };

  const handleReset = () => {
    setMatches({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setIsCompleted(false);
    setIsCorrect(false);
  };

  const getMatchedRight = (leftId: string) => {
    return matches[leftId];
  };

  const isRightMatched = (rightId: string) => {
    return Object.values(matches).includes(rightId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg mb-4 text-neutral-700">
            {t('exercises.leftColumn', { defaultValue: 'Левая колонка' })}
          </h3>
          {items.map((item) => {
            const matchedRight = getMatchedRight(item.id);
            const isSelected = selectedLeft === item.id;
            const isMatched = !!matchedRight;
            const isCorrectMatch = isCompleted && matchedRight === item.right;
            const isWrongMatch = isCompleted && isMatched && matchedRight !== item.right;

            return (
              <div
                key={item.id}
                onClick={() => !isCompleted && handleLeftClick(item.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-100'
                    : isMatched
                    ? 'border-neutral-300 bg-neutral-100'
                    : 'border-neutral-300 bg-white hover:border-primary-400'
                } ${
                  isCorrectMatch
                    ? 'border-green-500 bg-green-50'
                    : ''
                } ${
                  isWrongMatch
                    ? 'border-red-500 bg-red-50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{item.left}</span>
                  {isCompleted && (
                    <>
                      {isCorrectMatch && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {isWrongMatch && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg mb-4 text-neutral-700">
            Правая колонка
          </h3>
          {items.map((item) => {
            const rightId = item.right;
            const isSelected = selectedRight === rightId;
            const isMatched = isRightMatched(rightId);
            const matchedLeft = Object.keys(matches).find(
              (key) => matches[key] === rightId
            );
            const isCorrectMatch = isCompleted && matchedLeft === item.id;
            const isWrongMatch = isCompleted && isMatched && matchedLeft !== item.id;

            return (
              <div
                key={rightId}
                onClick={() => !isCompleted && handleRightClick(rightId)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-100'
                    : isMatched
                    ? 'border-neutral-300 bg-neutral-100'
                    : 'border-neutral-300 bg-white hover:border-primary-400'
                } ${
                  isCorrectMatch
                    ? 'border-green-500 bg-green-50'
                    : ''
                } ${
                  isWrongMatch
                    ? 'border-red-500 bg-red-50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{rightId}</span>
                  {isCompleted && (
                    <>
                      {isCorrectMatch && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {isWrongMatch && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>{t('exercises.instruction', { defaultValue: 'Инструкция' })}:</strong> {t('exercises.matchingInstruction', { defaultValue: 'Нажмите на элемент в левой колонке, затем на соответствующий элемент в правой колонке, чтобы создать пару.' })}
        </p>
      </div>

      {/* Actions */}
      {!isCompleted ? (
        <button onClick={handleCheck} className="btn-primary w-full">
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
              {isCorrect ? t('exercises.allCorrect', { defaultValue: '✓ Все правильно!' }) : t('exercises.hasErrors', { defaultValue: '✗ Есть ошибки. Попробуйте еще раз.' })}
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
