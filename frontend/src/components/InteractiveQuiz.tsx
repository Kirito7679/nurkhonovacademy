import { useState, useEffect } from 'react';
import { QuizQuestion, QuizOption } from '../types';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface InteractiveQuizProps {
  question: QuizQuestion;
  onAnswer: (answer: any) => void;
  showResult?: boolean;
  correctAnswer?: any;
}

export default function InteractiveQuiz({ question, onAnswer, showResult, correctAnswer }: InteractiveQuizProps) {
  const [dragItems, setDragItems] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string | null }[]>([]);
  const [fillBlanks, setFillBlanks] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (question.metadata) {
      const metadata = JSON.parse(question.metadata);
      
      if (question.type === 'DRAG_DROP') {
        setDragItems([...metadata.items]);
        setTargets(metadata.targets.map(() => null));
      } else if (question.type === 'MATCHING') {
        setMatchingPairs(metadata.leftItems.map((item: string) => ({ left: item, right: null })));
      }
    }
  }, [question]);

  const handleDragStart = (e: React.DragEvent, item: string) => {
    e.dataTransfer.setData('text/plain', item);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain');
    const newTargets = [...targets];
    newTargets[targetIndex] = item;
    setTargets(newTargets);
    setDragItems(dragItems.filter(i => i !== item));
    onAnswer(newTargets);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleMatchingSelect = (leftIndex: number, rightItem: string) => {
    const newPairs = [...matchingPairs];
    newPairs[leftIndex].right = rightItem;
    setMatchingPairs(newPairs);
    onAnswer(newPairs);
  };

  const handleFillBlank = (blankIndex: number, value: string) => {
    setFillBlanks({ ...fillBlanks, [blankIndex]: value });
    onAnswer(fillBlanks);
  };

  const resetDragDrop = () => {
    if (question.metadata) {
      const metadata = JSON.parse(question.metadata);
      setDragItems([...metadata.items]);
      setTargets(metadata.targets.map(() => null));
    }
  };

  const resetMatching = () => {
    if (question.metadata) {
      const metadata = JSON.parse(question.metadata);
      setMatchingPairs(metadata.leftItems.map((item: string) => ({ left: item, right: null })));
    }
  };

  if (question.type === 'DRAG_DROP') {
    const metadata = question.metadata ? JSON.parse(question.metadata) : null;
    if (!metadata) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">{question.question}</h3>
          <button
            onClick={resetDragDrop}
            className="text-sm text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Перетащите элементы:</h4>
            <div className="space-y-2">
              {dragItems.map((item, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className="p-3 bg-primary-100 text-primary-900 rounded-lg cursor-move hover:bg-primary-200 transition-colors"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Целевые области:</h4>
            <div className="space-y-2">
              {metadata.targets.map((target: string, index: number) => (
                <div
                  key={index}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={handleDragOver}
                  className={`p-3 border-2 border-dashed rounded-lg min-h-[50px] flex items-center ${
                    targets[index]
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-300'
                  }`}
                >
                  {targets[index] ? (
                    <span className="text-primary-900 font-medium">{targets[index]}</span>
                  ) : (
                    <span className="text-neutral-400">{target}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showResult && correctAnswer && (
          <div className="mt-4 p-4 rounded-lg bg-neutral-50">
            <p className="text-sm text-neutral-600">
              Правильный ответ: {JSON.stringify(correctAnswer)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (question.type === 'MATCHING') {
    const metadata = question.metadata ? JSON.parse(question.metadata) : null;
    if (!metadata) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">{question.question}</h3>
          <button
            onClick={resetMatching}
            className="text-sm text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Левая колонка:</h4>
            <div className="space-y-2">
              {matchingPairs.map((pair, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 ${
                    pair.right
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-300 bg-neutral-50'
                  }`}
                >
                  {pair.left}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Правая колонка:</h4>
            <div className="space-y-2">
              {metadata.rightItems.map((rightItem: string, index: number) => {
                const isSelected = matchingPairs.some(p => p.right === rightItem);
                return (
                  <button
                    key={index}
                    onClick={() => {
                      const leftIndex = matchingPairs.findIndex(p => !p.right);
                      if (leftIndex !== -1 && !isSelected) {
                        handleMatchingSelect(leftIndex, rightItem);
                      }
                    }}
                    disabled={isSelected}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 cursor-not-allowed'
                        : 'border-neutral-300 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {rightItem}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showResult && correctAnswer && (
          <div className="mt-4 p-4 rounded-lg bg-neutral-50">
            <p className="text-sm text-neutral-600">
              Правильные пары: {JSON.stringify(correctAnswer)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (question.type === 'FILL_BLANK') {
    const metadata = question.metadata ? JSON.parse(question.metadata) : null;
    if (!metadata) return null;

    const textParts = metadata.text.split('___');
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">{question.question}</h3>
        <div className="p-4 bg-neutral-50 rounded-lg">
          {textParts.map((part: string, index: number) => (
            <span key={index}>
              {part}
              {index < textParts.length - 1 && (
                <input
                  type="text"
                  value={fillBlanks[index] || ''}
                  onChange={(e) => handleFillBlank(index, e.target.value)}
                  className="inline-block mx-2 px-2 py-1 border-2 border-primary-300 rounded focus:outline-none focus:border-primary-500 min-w-[100px]"
                  placeholder="..."
                />
              )}
            </span>
          ))}
        </div>
        {showResult && correctAnswer && (
          <div className="mt-4 p-4 rounded-lg bg-neutral-50">
            <p className="text-sm text-neutral-600">
              Правильный ответ: {JSON.stringify(correctAnswer)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
