import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { uploadBrochureToOneDrive, compressAndUploadPhoto, compressImage, getOneDriveWebsiteFolder, backupDataToOneDrive } from '../storageService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'property-photos/sample.jpg' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://placeholder-realtor-buddy.supabase.co/storage/v1/object/public/property-photos/sample.jpg' }
          }),
        }),
      },
    },
  };
});

describe('Storage Service', () => {
  const envTokenBackup = import.meta.env.VITE_MS_GRAPH_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_MS_GRAPH_TOKEN = '';
  });

  afterAll(() => {
    import.meta.env.VITE_MS_GRAPH_TOKEN = envTokenBackup;
  });

  describe('uploadBrochureToOneDrive', () => {
    it('uploads PDF brochure to OneDrive and returns direct embed url in sandbox mode', async () => {
      const mockFile = new File(['%PDF-1.4 dummy content'], 'dubai_brochure.pdf', { type: 'application/pdf' });
      const result = await uploadBrochureToOneDrive(mockFile);
      
      expect(result).toBeDefined();
      expect(result.embedUrl).toContain('onedrive');
      expect(result.webUrl).toBeDefined();
      expect(result.fileName).toBe('dubai_brochure.pdf');
    });

    it('rejects non-PDF files', async () => {
      const mockFile = new File(['dummy doc content'], 'brochure.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      await expect(uploadBrochureToOneDrive(mockFile)).rejects.toThrow(/PDF/i);
    });

    it('uses Microsoft Graph API when token is provided', async () => {
      const originalFetch = globalThis.fetch;
      const originalEnvToken = import.meta.env.VITE_MS_GRAPH_TOKEN;

      import.meta.env.VITE_MS_GRAPH_TOKEN = 'mock-ms-token';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'ms-drive-item-123',
          name: 'dubai_tower.pdf',
          webUrl: 'https://tenant-my.sharepoint.com/personal/user/Documents/RealtorBuddy/Brochures/dubai_tower.pdf',
        }),
      });
      globalThis.fetch = mockFetch;

      try {
        const mockFile = new File(['%PDF-1.4'], 'dubai_tower.pdf', { type: 'application/pdf' });
        const result = await uploadBrochureToOneDrive(mockFile);

        expect(mockFetch).toHaveBeenCalled();
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('graph.microsoft.com');
        expect(url).toContain('RealtorBuddy/Brochures/');
        expect(url).toContain('dubai_tower.pdf');
        expect(url).toContain('@microsoft.graph.conflictBehavior=rename');
        expect(options.headers.Authorization).toBe('Bearer mock-ms-token');
        expect(result.fileName).toBe('dubai_tower.pdf');
        expect(result.webUrl).toContain('tenant-my.sharepoint.com');
        expect(result.embedUrl).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
        import.meta.env.VITE_MS_GRAPH_TOKEN = originalEnvToken;
      }
    });
  });

  describe('compressAndUploadPhoto', () => {
    it('uploads photo to Supabase storage bucket property-photos and returns public URL', async () => {
      const mockPhoto = new File(['fake-image-bytes'], 'dubai_penthouse.jpg', { type: 'image/jpeg' });
      const publicUrl = await compressAndUploadPhoto(mockPhoto);

      expect(supabase.storage.from).toHaveBeenCalledWith('property-photos');
      const storageFrom = (supabase.storage.from as any)('property-photos');
      expect(storageFrom.upload).toHaveBeenCalled();
      expect(storageFrom.getPublicUrl).toHaveBeenCalled();
      expect(publicUrl).toContain('property-photos');
    });

    it('throws error when Supabase upload fails', async () => {
      const storageFrom = (supabase.storage.from as any)('property-photos');
      storageFrom.upload.mockResolvedValueOnce({ data: null, error: new Error('Upload error: quota exceeded') });

      const mockPhoto = new File(['fake-image-bytes'], 'fail.jpg', { type: 'image/jpeg' });
      await expect(compressAndUploadPhoto(mockPhoto)).rejects.toThrow('Upload error: quota exceeded');
    });
  });

  describe('getOneDriveWebsiteFolder and backupDataToOneDrive', () => {
    it('returns default or custom website folder in OneDrive', () => {
      expect(getOneDriveWebsiteFolder()).toBe('RealtorBuddy');
    });

    it('backs up data to dedicated OneDrive folder', async () => {
      const res = await backupDataToOneDrive({ status: 'live' }, 'test_backup.json');
      expect(res.success).toBe(true);
      expect(res.webUrl).toContain('test_backup.json');
    });
  });
});
