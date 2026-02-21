-- Storage bucket policies for tax-docs (private bucket)
-- Path convention: tax-docs/{user_id}/{timestamp}_{filename}
-- The first path segment must equal auth.uid() for all operations.

-- Users can upload files only under their own folder
CREATE POLICY "storage_user_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tax-docs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can read their own files
CREATE POLICY "storage_user_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tax-docs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can delete their own files
CREATE POLICY "storage_user_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tax-docs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can update (replace) their own files
CREATE POLICY "storage_user_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tax-docs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'tax-docs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
