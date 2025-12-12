import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { PracticeExercise, DragDropExercise, MatchingExercise } from '../types';

interface ExerciseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: PracticeExercise) => void;
  exercise: PracticeExercise | null;
}

export default function ExerciseEditModal({
  isOpen,
  onClose,
  onSave,
  exercise,
}: ExerciseEditModalProps) {
  const [title, setTitle] = useState('');
  const [exerciseData, setExerciseData] = useState<DragDropExercise | MatchingExercise | null>(null);

  useEffect(() => {
    if (isOpen && exercise) {
      setTitle(exercise.title);
      try {
        const metadata = exercise.instructions ? JSON.parse(exercise.instructions) : null;
        setExerciseData(metadata);
      } catch {
        // If parsing fails, create default structure
        if (exercise.type === 'DRAG_DROP') {
          setExerciseData({
            type: 'DRAG_DROP',
            items: [],
            dropZones: [],
          });
        } else if (exercise.type === 'MATCHING') {
          setExerciseData({
            type: 'MATCHING',
            items: [],
          });
        }
      }
    }
  }, [isOpen, exercise]);

  if (!isOpen || !exercise) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    const updatedExercise: PracticeExercise = {
      ...exercise,
      title: title.trim(),
      instructions: exerciseData ? JSON.stringify(exerciseData) : '',
    };

    onSave(updatedExercise);
    onClose();
  };

  const addDragDropItem = () => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      const newId = `item_${Date.now()}`;
      setExerciseData({
        ...exerciseData,
        items: [...exerciseData.items, { id: newId, content: '' }],
      });
    }
  };

  const addDragDropZone = () => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      const newId = `zone_${Date.now()}`;
      setExerciseData({
        ...exerciseData,
        dropZones: [...exerciseData.dropZones, { id: newId, label: '', correctItemId: '' }],
      });
    }
  };

  const addMatchingItem = () => {
    if (exerciseData && exerciseData.type === 'MATCHING') {
      const newId = `item_${Date.now()}`;
      setExerciseData({
        ...exerciseData,
        items: [...exerciseData.items, { id: newId, left: '', right: '' }],
      });
    }
  };

  const updateDragDropItem = (itemId: string, content: string) => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      setExerciseData({
        ...exerciseData,
        items: exerciseData.items.map((item) =>
          item.id === itemId ? { ...item, content } : item
        ),
      });
    }
  };

  const updateDragDropZone = (zoneId: string, field: 'label' | 'correctItemId', value: string) => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      setExerciseData({
        ...exerciseData,
        dropZones: exerciseData.dropZones.map((zone) =>
          zone.id === zoneId ? { ...zone, [field]: value } : zone
        ),
      });
    }
  };

  const updateMatchingItem = (itemId: string, field: 'left' | 'right', value: string) => {
    if (exerciseData && exerciseData.type === 'MATCHING') {
      setExerciseData({
        ...exerciseData,
        items: exerciseData.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      });
    }
  };

  const removeDragDropItem = (itemId: string) => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      setExerciseData({
        ...exerciseData,
        items: exerciseData.items.filter((item) => item.id !== itemId),
        dropZones: exerciseData.dropZones.map((zone) =>
          zone.correctItemId === itemId ? { ...zone, correctItemId: '' } : zone
        ),
      });
    }
  };

  const removeDragDropZone = (zoneId: string) => {
    if (exerciseData && exerciseData.type === 'DRAG_DROP') {
      setExerciseData({
        ...exerciseData,
        dropZones: exerciseData.dropZones.filter((zone) => zone.id !== zoneId),
      });
    }
  };

  const removeMatchingItem = (itemId: string) => {
    if (exerciseData && exerciseData.type === 'MATCHING') {
      setExerciseData({
        ...exerciseData,
        items: exerciseData.items.filter((item) => item.id !== itemId),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-scale p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative animate-slide-in overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">
            Редактировать упражнение
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors bg-white/20 backdrop-blur-sm rounded-full p-1.5 hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                Название упражнения
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                placeholder="Введите название упражнения"
              />
            </div>

            {/* Drag & Drop Editor */}
            {exercise.type === 'DRAG_DROP' && exerciseData && exerciseData.type === 'DRAG_DROP' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-neutral-900">Элементы для перетаскивания</h4>
                  <button
                    onClick={addDragDropItem}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить элемент
                  </button>
                </div>
                <div className="space-y-2">
                  {exerciseData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
                      <input
                        type="text"
                        value={item.content}
                        onChange={(e) => updateDragDropItem(item.id, e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                        placeholder="Содержимое элемента"
                      />
                      <button
                        onClick={() => removeDragDropItem(item.id)}
                        className="text-red-500 hover:text-red-600 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-6">
                  <h4 className="text-lg font-semibold text-neutral-900">Зоны для размещения</h4>
                  <button
                    onClick={addDragDropZone}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить зону
                  </button>
                </div>
                <div className="space-y-2">
                  {exerciseData.dropZones.map((zone) => (
                    <div key={zone.id} className="p-3 bg-neutral-50 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={zone.label}
                        onChange={(e) => updateDragDropZone(zone.id, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                        placeholder="Название зоны"
                      />
                      <select
                        value={zone.correctItemId}
                        onChange={(e) => updateDragDropZone(zone.id, 'correctItemId', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                      >
                        <option value="">Выберите правильный элемент</option>
                        {exerciseData.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.content || `Элемент ${item.id}`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeDragDropZone(zone.id)}
                        className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Удалить зону
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Editor */}
            {exercise.type === 'MATCHING' && exerciseData && exerciseData.type === 'MATCHING' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-neutral-900">Пары для сопоставления</h4>
                  <button
                    onClick={addMatchingItem}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить пару
                  </button>
                </div>
                <div className="space-y-2">
                  {exerciseData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
                      <input
                        type="text"
                        value={item.left}
                        onChange={(e) => updateMatchingItem(item.id, 'left', e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                        placeholder="Левая часть"
                      />
                      <span className="text-neutral-500">→</span>
                      <input
                        type="text"
                        value={item.right}
                        onChange={(e) => updateMatchingItem(item.id, 'right', e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500"
                        placeholder="Правая часть"
                      />
                      <button
                        onClick={() => removeMatchingItem(item.id)}
                        className="text-red-500 hover:text-red-600 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

