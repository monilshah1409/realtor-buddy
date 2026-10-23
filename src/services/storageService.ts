import { supabase } from '../lib/supabase';

export interface OneDriveUploadResult {
  webUrl: string;
  embedUrl: string;
  fileName: string;
}

/**
 * Validates whether a file is a PDF document.
 */
function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Uploads a local desktop PDF brochure to Microsoft OneDrive via Microsoft Graph API.
 * 
 * Target endpoint: `/me/drive/root:/RealtorBuddy/Brochures/${file.name}:/content`
 * 
 * If Microsoft Graph API credentials (`VITE_MS_GRAPH_TOKEN`) are not provided
 * in the environment (e.g. offline development, unit tests, or sandbox demo),
 * it seamlessly returns a simulated OneDrive embed and sharing URL.
 */
export async function uploadBrochureToOneDrive(file: File): Promise<OneDriveUploadResult> {
  if (!isPdfFile(file)) {
    throw new Error('Only PDF files are supported for property brochures.');
  }

  const msGraphToken =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_MS_GRAPH_TOKEN) ||
    null;

  if (msGraphToken) {
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
    const encodedUniqueFileName = encodeURIComponent(uniqueFileName);
    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/RealtorBuddy/Brochures/${encodedUniqueFileName}:/content?@microsoft.graph.conflictBehavior=rename`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${msGraphToken}`,
        'Content-Type': 'application/pdf',
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Graph upload failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const driveItemId = data.id || encodedUniqueFileName;
    const webUrl = data.webUrl || `https://1drv.ms/b/s!${driveItemId}`;
    const embedUrl = data.webUrl && data.webUrl.includes('onedrive.live.com')
      ? data.webUrl
      : `https://onedrive.live.com/embed?resid=${encodeURIComponent(driveItemId)}`;

    return {
      webUrl,
      embedUrl,
      fileName: file.name,
    };
  }

  // Mock / Sandbox fallback for offline dev & test execution
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
  const uniquePrefix = Date.now().toString(36);
  const mockResId = `MOCK_ONEDRIVE_${uniquePrefix}_${sanitizedName}`;
  const embedUrl = `https://onedrive.live.com/embed?resid=${mockResId}`;
  const webUrl = `https://1drv.ms/b/s!mock-${uniquePrefix}-${encodeURIComponent(file.name)}`;

  return {
    webUrl,
    embedUrl,
    fileName: file.name,
  };
}

/**
 * Resizes and compresses an image file using client-side HTML canvas.
 * Downscales images exceeding maxWidth/maxHeight (default 1200px) and applies
 * WebP / JPEG compression at ~0.8 quality to keep image sizes small (<150KB).
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<Blob> {
  // If running in an environment without DOM or Canvas support (e.g., Node/JSDOM),
  // fallback gracefully to the original file.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise<Blob>((resolve) => {
    let canvas: HTMLCanvasElement;
    try {
      canvas = document.createElement('canvas');
      if (!canvas || typeof canvas.getContext !== 'function') {
        return resolve(file);
      }
    } catch {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/webp',
            quality
          );
        } else {
          cleanup();
          resolve(file);
        }
      } catch {
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image client-side and uploads it to the Supabase Storage bucket `'property-photos'`.
 * Returns the public URL of the uploaded image.
 */
export async function compressAndUploadPhoto(file: File): Promise<string> {
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
  if (!isImage) {
    throw new Error('Selected file is not an image');
  }

  let uploadPayload: Blob = file;
  try {
    uploadPayload = await compressImage(file);
  } catch {
    // Fall back to original file if compression encounters any error
    uploadPayload = file;
  }

  const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${uniqueId}_${cleanBaseName}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('property-photos')
    .upload(filePath, uploadPayload, {
      contentType: uploadPayload.type || file.type || 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload photo to Supabase: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('property-photos')
    .getPublicUrl(data?.path || filePath);

  return publicUrlData.publicUrl;
}
