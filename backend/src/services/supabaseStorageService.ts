import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

const initSupabase = () => {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
};

export interface UploadResult {
  path: string;
  url: string;
  publicUrl: string;
}

/**
 * Upload file buffer to Supabase Storage
 */
export const uploadToSupabase = async (
  buffer: Buffer,
  bucket: string,
  fileName: string,
  contentType: string
): Promise<UploadResult> => {
  const client = initSupabase();
  if (!client) {
    throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }

  // Check if bucket exists
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    console.error('Error listing Supabase buckets:', listError);
    throw new Error(`Failed to access Supabase Storage: ${listError.message}`);
  }

  const bucketExists = buckets?.some(b => b.name === bucket);
  if (!bucketExists) {
    throw new Error(`Bucket '${bucket}' does not exist in Supabase Storage. Please create it in the Supabase Dashboard.`);
  }

  // Generate unique filename
  const ext = fileName.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${ext}`;
  const filePath = `${uniqueFileName}`;

  // Upload file
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL from Supabase');
  }

  return {
    path: filePath,
    url: urlData.publicUrl,
    publicUrl: urlData.publicUrl,
  };
};

/**
 * Upload avatar image with optimization
 */
export const uploadAvatar = async (
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> => {
  const contentType = 'image/jpeg'; // Supabase will handle optimization
  return uploadToSupabase(buffer, 'avatars', originalName, contentType);
};

/**
 * Upload lesson file (PDFs, documents, videos, etc.)
 */
export const uploadLessonFile = async (
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<UploadResult> => {
  // Determine resource type for Supabase
  const isVideo = contentType.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'auto';
  
  return uploadToSupabase(buffer, 'lessons', originalName, contentType);
};

/**
 * Delete file from Supabase Storage
 */
export const deleteFromSupabase = async (
  bucket: string,
  filePath: string
): Promise<void> => {
  const client = initSupabase();
  if (!client) {
    console.error('Supabase not configured');
    return;
  }

  try {
    const { error } = await client.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting from Supabase:', error);
    }
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
  }
};

/**
 * Extract file path from Supabase URL
 */
export const extractFilePath = (url: string): { bucket: string; path: string } | null => {
  try {
    // Supabase URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
    if (match) {
      return {
        bucket: match[1],
        path: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
};

export default initSupabase;
