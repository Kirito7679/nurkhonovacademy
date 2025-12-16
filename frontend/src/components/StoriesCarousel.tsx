import { useQuery, useMutation } from 'react-query';
import api from '../services/api';
import { ApiResponse, Story } from '../types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StoriesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewing, setIsViewing] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(0);

  const { data: storiesResponse } = useQuery(
    'stories',
    async () => {
      const response = await api.get<ApiResponse<Story[]>>('/stories');
      return response.data.data || [];
    }
  );

  const viewStoryMutation = useMutation(
    async (storyId: string) => {
      await api.post(`/stories/${storyId}/view`);
    }
  );

  const stories = storiesResponse || [];

  useEffect(() => {
    if (stories.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [stories.length]);

  const handleStoryClick = (index: number) => {
    setViewingIndex(index);
    setIsViewing(true);
    if (stories[index]) {
      viewStoryMutation.mutate(stories[index].id);
    }
  };

  const handleNext = () => {
    if (viewingIndex < stories.length - 1) {
      setViewingIndex(viewingIndex + 1);
      viewStoryMutation.mutate(stories[viewingIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
      viewStoryMutation.mutate(stories[viewingIndex - 1].id);
    }
  };

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {stories.map((story, index) => (
          <div
            key={story.id}
            onClick={() => handleStoryClick(index)}
            className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden cursor-pointer border-2 border-primary-300 hover:border-primary-500 transition-all"
          >
            <img
              src={story.imageUrl}
              alt={story.title || 'Story'}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {isViewing && stories[viewingIndex] && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setIsViewing(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {viewingIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {viewingIndex < stories.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-md w-full mx-4">
            {stories[viewingIndex].videoUrl ? (
              <video
                src={stories[viewingIndex].videoUrl}
                autoPlay
                loop
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <img
                src={stories[viewingIndex].imageUrl}
                alt={stories[viewingIndex].title || 'Story'}
                className="w-full h-auto rounded-lg"
              />
            )}
            {stories[viewingIndex].title && (
              <p className="text-white text-center mt-4">{stories[viewingIndex].title}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
