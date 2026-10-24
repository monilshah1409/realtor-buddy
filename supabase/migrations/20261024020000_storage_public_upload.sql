-- Enable seamless uploads to property-photos for both anon and authenticated brokers
DO $$ BEGIN
  CREATE POLICY "allow_photo_uploads_all"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'property-photos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "allow_photo_updates_all"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id = 'property-photos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
