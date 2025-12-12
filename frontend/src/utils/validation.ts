// Video source types
export type VideoSourceType = 'youtube' | 'vimeo' | 'google-drive' | 'vk' | 'direct' | 'other';

// Extract YouTube video ID
export const extractYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Extract Vimeo video ID
export const extractVimeoVideoId = (url: string): string | null => {
  const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Extract Google Drive video ID
export const extractGoogleDriveVideoId = (url: string): string | null => {
  // Google Drive share link format: https://drive.google.com/file/d/FILE_ID/view
  const regExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Extract VK video ID
export const extractVKVideoId = (url: string): string | null => {
  // VK video format: https://vk.com/video-123456789_123456789
  const regExp = /vk\.com\/video(-?\d+_\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Detect video source type
export const detectVideoSource = (url: string): VideoSourceType => {
  if (!url) return 'other';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo';
  }
  if (lowerUrl.includes('drive.google.com')) {
    return 'google-drive';
  }
  if (lowerUrl.includes('vk.com/video')) {
    return 'vk';
  }
  
  // Check if it's a direct video URL (mp4, webm, etc.)
  if (/\.(mp4|webm|ogg|mov|avi|wmv|flv)(\?.*)?$/i.test(url)) {
    return 'direct';
  }
  
  return 'other';
};

// Get embed URL for any video source
export const getVideoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  const sourceType = detectVideoSource(url);
  
  switch (sourceType) {
    case 'youtube': {
      const videoId = extractYouTubeVideoId(url);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    case 'vimeo': {
      const videoId = extractVimeoVideoId(url);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    case 'google-drive': {
      const videoId = extractGoogleDriveVideoId(url);
      return videoId ? `https://drive.google.com/file/d/${videoId}/preview` : null;
    }
    case 'vk': {
      // VK videos need special handling - return original URL for ReactPlayer
      return url;
    }
    case 'direct':
    case 'other':
      return url;
    default:
      return url;
  }
};

// Legacy function for backward compatibility
export const getYouTubeEmbedUrl = (url: string): string | null => {
  return getVideoEmbedUrl(url);
};

// Validate video URL (supports multiple sources)
export const validateVideoUrl = (url: string): boolean => {
  if (!url) return true; // Empty URL is valid (optional field)
  
  const sourceType = detectVideoSource(url);
  
  switch (sourceType) {
    case 'youtube':
      return extractYouTubeVideoId(url) !== null;
    case 'vimeo':
      return extractVimeoVideoId(url) !== null;
    case 'google-drive':
      return extractGoogleDriveVideoId(url) !== null;
    case 'vk':
      return extractVKVideoId(url) !== null;
    case 'direct':
      // Validate direct video URL format
      return /^https?:\/\/.+\.(mp4|webm|ogg|mov|avi|wmv|flv)(\?.*)?$/i.test(url);
    case 'other':
      // Allow any valid URL for other sources
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
};

