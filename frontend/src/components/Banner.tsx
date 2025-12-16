import { useQuery } from 'react-query';
import api from '../services/api';
import { ApiResponse, Banner as BannerType } from '../types';
import { memo } from 'react';

interface BannerProps {
  position?: 'TOP' | 'BOTTOM' | 'SIDEBAR';
}

const Banner = memo(function Banner({ position = 'TOP' }: BannerProps) {
  const { data: bannersResponse } = useQuery(
    ['banners', position],
    async () => {
      const response = await api.get<ApiResponse<BannerType[]>>('/banners', {
        params: { position },
      });
      return response.data.data || [];
    },
    {
      staleTime: 15 * 60 * 1000, // 15 minutes - banners change rarely
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    }
  );

  const banners = bannersResponse || [];

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${position === 'TOP' ? 'mb-6' : position === 'BOTTOM' ? 'mt-6' : ''}`}>
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.link || '#'}
          target={banner.link ? '_blank' : undefined}
          rel={banner.link ? 'noopener noreferrer' : undefined}
          className="block w-full rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
        >
          <img
            src={banner.imageUrl}
            alt={banner.title || 'Banner'}
            className="w-full h-auto"
          />
        </a>
      ))}
    </div>
  );
});

export default Banner;
