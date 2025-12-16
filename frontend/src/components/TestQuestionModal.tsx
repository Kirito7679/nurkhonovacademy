import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { IntermediateTestQuestion } from '../types';

interface TestQuestionModalProps {
  isOpen: boolean;
  question: IntermediateTestQuestion | null;
  onClose: () => void;
  onSave: (question: IntermediateTestQuestion) => void;
}

export default function TestQuestionModal({
  isOpen,
  question,
  onClose,
  onSave,
}: TestQuestionModalProps) {
  const [formData, setFormData] = useState<IntermediateTestQuestion>({
    id: '',
    testId: '',
    question: '',
    type: 'SINGLE',
    order: 0,
    points: 1,
    options: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newOptionText, setNewOptionText] = useState('');

  useEffect(() => {
    if (question) {
      setFormData({
        ...question,
        options: question.options || [],
      });
    } else {
      setFormData({
        id: '',
        testId: '',
        question: '',
        type: 'SINGLE',
        order: 0,
        points: 1,
        options: [],
      });
    }
    setErrors({});
    setNewOptionText('');
  }, [question, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Вопрос обязателен';
    }

    if (formData.points < 1) {
      newErrors.points = 'Баллы должны быть больше 0';
    }

    if (formData.type !== 'TEXT' && formData.options.length < 2) {
      newErrors.options = 'Добавьте минимум 2 варианта ответа';
    }

    if (formData.type !== 'TEXT') {
      const hasCorrect = formData.options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        newErrors.options = 'Выберите хотя бы один правильный ответ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      ...formData,
      options: formData.options.map((opt, idx) => ({
        ...opt,
        order: idx,
      })),
    });
    onClose();
  };

  const addOption = () => {
    if (!newOptionText.trim()) return;

    setFormData({
      ...formData,
      options: [
        ...formData.options,
        {
          id: '',
          questionId: '',
          text: newOptionText.trim(),
          isCorrect: false,
          order: formData.options.length,
        },
      ],
    });
    setNewOptionText('');
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const toggleCorrect = (index: number) => {
    const newOptions = [...formData.options];
    
    if (formData.type === 'SINGLE') {
      // For single choice, only one can be correct
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      // For multiple choice, toggle
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }
    
    setFormData({ ...formData, options: newOptions });
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.options.length - 1)
    ) {
      return;
    }

    const newOptions = [...formData.options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOptions[index], newOptions[targetIndex]] = [
      newOptions[targetIndex],
      newOptions[index],
    ];

    setFormData({ ...formData, options: newOptions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">
            {question ? 'Редактировать вопрос' : 'Добавить вопрос'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Текст вопроса *
            </label>
            <textarea
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              className="input-field min-h-[100px]"
              placeholder="Введите вопрос..."
            />
            {errors.question && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.question}
              </p>
            )}
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Тип вопроса *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'SINGLE', label: 'Один ответ', icon: '○' },
                { value: 'MULTIPLE', label: 'Несколько ответов', icon: '☑' },
                { value: 'TEXT', label: 'Текстовый ответ', icon: '✎' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      type: type.value as 'SINGLE' | 'MULTIPLE' | 'TEXT',
                      options: type.value === 'TEXT' ? [] : formData.options,
                    });
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.type === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium text-neutral-700">
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Баллы за правильный ответ *
            </label>
            <input
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  points: parseInt(e.target.value) || 1,
                })
              }
              className="input-field w-32"
            />
            {errors.points && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.points}
              </p>
            )}
          </div>

          {/* Options (for SINGLE and MULTIPLE) */}
          {formData.type !== 'TEXT' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Варианты ответов *
                <span className="text-neutral-500 text-xs ml-2">
                  (минимум 2, выберите правильные)
                </span>
              </label>

              {/* Add Option */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  className="input-field flex-1"
                  placeholder="Введите вариант ответа и нажмите Enter или кнопку"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="btn-primary whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </button>
              </div>

              {errors.options && (
                <p className="mb-3 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.options}
                </p>
              )}

              {/* Options List */}
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                      option.isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-neutral-600 cursor-move"
                      title="Перетащите для изменения порядка"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCorrect(index)}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        option.isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-neutral-300 hover:border-primary-500'
                      }`}
                      title={
                        formData.type === 'SINGLE'
                          ? 'Правильный ответ (только один)'
                          : 'Правильный ответ'
                      }
                    >
                      {option.isCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index].text = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      className="input-field flex-1 border-0 bg-transparent p-0"
                      placeholder="Вариант ответа"
                    />

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveOption(index, 'up')}
                        disabled={index === 0}
                        className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                        title="Вверх"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOption(index, 'down')}
                        disabled={index === formData.options.length - 1}
                        className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                        title="Вниз"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {formData.options.length === 0 && (
                <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg">
                  <p>Добавьте варианты ответов</p>
                </div>
              )}
            </div>
          )}

          {/* Text Answer Info */}
          {formData.type === 'TEXT' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Текстовый ответ:</strong> Студенты введут текстовый ответ,
                который будет проверяться вручную или автоматически (если настроено).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
          >
            Сохранить вопрос
          </button>
        </div>
      </div>
    </div>
  );
}
