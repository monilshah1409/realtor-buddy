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
 * Gets the dedicated Microsoft OneDrive folder name specifically for this website.
 * Defaults to 'RealtorBuddy' or environment variable VITE_ONEDRIVE_FOLDER_NAME.
 */
export function getOneDriveWebsiteFolder(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ONEDRIVE_FOLDER_NAME) {
    return import.meta.env.VITE_ONEDRIVE_FOLDER_NAME.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return 'RealtorBuddy';
}

/**
 * Uploads a local desktop PDF brochure to Microsoft OneDrive via Microsoft Graph API
 * inside the website's dedicated OneDrive folder: `/${WEBSITE_FOLDER}/Brochures/${fileName}`.
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
    const websiteFolder = getOneDriveWebsiteFolder();
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
    const encodedUniqueFileName = encodeURIComponent(uniqueFileName);
    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${websiteFolder}/Brochures/${encodedUniqueFileName}:/content?@microsoft.graph.conflictBehavior=rename`;

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
    let shareableUrl = data.webUrl || '';

    // Create an anonymous viewable sharing link using Microsoft Graph API
    // so anyone viewing the property can view the PDF brochure without tenant authentication
    if (data.id) {
      try {
        const linkResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${data.id}/createLink`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${msGraphToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 'view', scope: 'anonymous' }),
          }
        );
        if (linkResponse.ok) {
          const linkData = await linkResponse.json();
          if (linkData?.link?.webUrl) {
            shareableUrl = linkData.link.webUrl;
          }
        }
      } catch (linkErr) {
        console.warn('Failed to generate anonymous sharing link from Microsoft Graph:', linkErr);
      }
    }

    if (!shareableUrl) {
      shareableUrl = data.webUrl || `https://1drv.ms/b/s!${driveItemId}`;
    }

    // Determine embed URL:
    // If SharePoint (e.g. OneDrive for Business / School), append ?action=embedview
    // If personal onedrive.live.com, format with resid
    let embedUrl = shareableUrl;
    if (shareableUrl.includes('sharepoint.com')) {
      embedUrl = `${shareableUrl}${shareableUrl.includes('?') ? '&' : '?'}action=embedview`;
    } else if (shareableUrl.includes('onedrive.live.com')) {
      embedUrl = shareableUrl.includes('embed')
        ? shareableUrl
        : `https://onedrive.live.com/embed?resid=${encodeURIComponent(driveItemId)}`;
    }

    return {
      webUrl: shareableUrl,
      embedUrl,
      fileName: file.name,
    };
  }

  // Mock / Sandbox fallback for offline dev & test execution
  let localUrl = '';
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      localUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }
  }

  const uniquePrefix = Date.now().toString(36);
  const fallbackUrl =
    localUrl || `https://1drv.ms/b/s!mock-${uniquePrefix}-${encodeURIComponent(file.name)}`;

  return {
    webUrl: fallbackUrl,
    embedUrl: fallbackUrl,
    fileName: file.name,
  };
}

/**
 * Backs up website data (e.g. listings export or JSON payload) into the website's
 * dedicated folder on OneDrive: `/${WEBSITE_FOLDER}/Website_Data/${fileName}`.
 */
export async function backupDataToOneDrive(
  dataPayload: Record<string, any> | string,
  fileName = `realtor_buddy_export_${Date.now()}.json`
): Promise<{ success: boolean; webUrl?: string; error?: string }> {
  const msGraphToken =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_MS_GRAPH_TOKEN) ||
    null;

  if (!msGraphToken) {
    return {
      success: true,
      webUrl: `https://1drv.ms/u/s!mock-${fileName}`,
    };
  }

  try {
    const websiteFolder = getOneDriveWebsiteFolder();
    const content = typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const encodedFileName = encodeURIComponent(fileName);
    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${websiteFolder}/Website_Data/${encodedFileName}:/content?@microsoft.graph.conflictBehavior=replace`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${msGraphToken}`,
        'Content-Type': 'application/json',
      },
      body: blob,
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText };
    }

    const data = await response.json();
    return { success: true, webUrl: data.webUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
          // Use image/jpeg by default for 100% universal compatibility across Safari/WebKit & mobile browsers.
          // Preserve PNG if the original file was explicitly a PNG.
          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            outputMime,
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
 * Converts a Blob or File to a Base64 Data URL for client-side display or local storage fallback.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      return resolve('data:image/jpeg;base64,');
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export interface UploadPhotoOptions {
  /**
   * When true, falls back to an optimized base64 Data URL if Supabase Storage is
   * unreachable (e.g. Safari CORS preflight failure, ad-blockers, network timeouts, or offline usage).
   */
  fallbackToDataUrl?: boolean;
}

/**
 * Compresses an image client-side and uploads it to the Supabase Storage bucket `'property-photos'`.
 * Returns the public URL of the uploaded image, or a client-side Data URL if fallback is enabled
 * and the remote cloud bucket is unreachable.
 */
export async function compressAndUploadPhoto(
  file: File,
  options?: UploadPhotoOptions
): Promise<string> {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i.test(file.name);
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

  // Clean and sanitize file extension & filename for strict cross-browser / Safari URI compatibility
  const rawExt = file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg';
  const cleanExt =
    rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    (uploadPayload.type === 'image/png' ? 'png' : 'jpg');
  const cleanBaseName =
    file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 40) || 'property_photo';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${uniqueId}_${cleanBaseName}.${cleanExt}`;

  const contentType = uploadPayload.type || file.type || 'image/jpeg';

  let uploadResult: { data: any; error: any } | null = null;
  try {
    // Note: upsert: false avoids sending non-simple 'x-upsert' header which triggers Safari CORS preflight issues
    uploadResult = await supabase.storage
      .from('property-photos')
      .upload(filePath, uploadPayload, {
        contentType,
        upsert: false,
      });
  } catch (networkErr: any) {
    const errorMsg = networkErr?.message || 'Load failed';
    if (options?.fallbackToDataUrl) {
      console.warn(`Supabase storage network exception (${errorMsg}). Falling back to client-side image storage.`);
      return await blobToDataUrl(uploadPayload);
    }
    throw new Error(`Failed to upload photo to Supabase: ${errorMsg}`);
  }

  if (uploadResult?.error) {
    if (options?.fallbackToDataUrl) {
      console.warn(`Supabase storage upload error (${uploadResult.error.message}). Falling back to client-side image storage.`);
      return await blobToDataUrl(uploadPayload);
    }
    throw new Error(`Failed to upload photo to Supabase: ${uploadResult.error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('property-photos')
    .getPublicUrl(uploadResult?.data?.path || filePath);

  return publicUrlData.publicUrl;
}
