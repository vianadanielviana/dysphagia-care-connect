-- Create storage bucket for daily record photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('daily-records', 'daily-records', false);

-- Create RLS policies for daily record photos
CREATE POLICY "Users can view their own daily record photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'daily-records' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own daily record photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'daily-records' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own daily record photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'daily-records' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own daily record photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'daily-records' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add photo_urls column to daily_records table to store photo references
ALTER TABLE daily_records 
ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_records_photo_urls ON daily_records USING GIN(photo_urls);
CREATE INDEX IF NOT EXISTS idx_daily_records_patient_date ON daily_records(patient_id, record_date);