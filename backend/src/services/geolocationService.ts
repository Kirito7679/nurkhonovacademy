import axios from 'axios';

interface GeolocationData {
  city?: string | undefined;
  region?: string | undefined;
  country?: string | undefined;
}

/**
 * Get user location from IP address using ipapi.co
 * Free tier: 1000 requests/day
 */
export const getLocationFromIP = async (ip: string): Promise<GeolocationData> => {
  try {
    // Remove port if present
    const cleanIP = ip.split(':')[0];
    
    // Skip localhost
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
      return {
        city: undefined,
        region: undefined,
        country: undefined,
      };
    }

    const response = await axios.get(`https://ipapi.co/${cleanIP}/json/`, {
      timeout: 5000,
    });

    return {
      city: response.data.city || undefined,
      region: response.data.region || undefined,
      country: response.data.country_name || undefined,
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      city: undefined,
      region: undefined,
      country: undefined,
    };
  }
};

/**
 * Get user location from request headers (X-Forwarded-For, etc.)
 */
export const getLocationFromRequest = async (req: any): Promise<GeolocationData> => {
  try {
    // Get IP from request
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               '';

    if (!ip) {
      return {
        city: undefined,
        region: undefined,
        country: undefined,
      };
    }

    return await getLocationFromIP(ip);
  } catch (error) {
    console.error('Error getting location from request:', error);
    return {
      city: undefined,
      region: undefined,
      country: undefined,
    };
  }
};
